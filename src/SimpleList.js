// @flow

import memoizeOne from 'memoize-one';
import { createElement, PureComponent } from 'react';
// $FlowFixMe
import { flushSync as maybeFlushSync } from 'react-dom';
// $FlowFixMe
import {
  unstable_IdlePriority as IdlePriority,
  unstable_runWithPriority as runWithPriority,
} from 'scheduler';
import { detectDisplayLockingSupport } from './domHelpers';
import { cancelTimeout, requestTimeout } from './timer';

import type { TimeoutID } from './timer';

export type ScrollToAlign = 'center' | 'minimum' | 'smart' | 'start' | 'end';

type Style = {
  [string]: mixed,
};

type itemRendererFn = ({|
  domProperties: Object,
  index: number,
  key: string | number,
  style: Style,
|}) => React$Node;

type onItemsDisplayedFn = (startIndex: number, stopIndex: number) => void;

type ScrollEvent = SyntheticEvent<HTMLElement>;

type ItemStyleCache = { [index: number]: Style };

type OuterProps = {|
  children: React$Node,
  className: string | void,
  onScroll: ScrollEvent => void,
  style: Style,
|};

type InnerProps = {|
  children: React$Node,
  style: Style,
|};

type PrerenderMode = 'none' | 'idle' | 'idle+debounce';

// Polyfill flushSync for older React versions.
const flushSync =
  typeof maybeFlushSync === 'function'
    ? maybeFlushSync
    : callback => callback();

const DEFAULT_MAX_NUM_PRERENDER_ROWS = 25;

export type Props = {|
  className?: string,
  height: number,
  initialScrollOffset?: number,
  innerRef?: any,
  innerElementType?: string | React$AbstractComponent<InnerProps, any>,
  itemCount: number,
  itemKey?: (index: number) => string | number,
  itemRenderer: itemRendererFn,
  itemSize: number,
  maxNumPrerenderRows?: number,
  onItemsDisplayed?: onItemsDisplayedFn,
  onScroll?: ScrollEvent => void,
  outerRef?: any,
  outerElementType?: string | React$AbstractComponent<OuterProps, any>,
  prerenderMode: PrerenderMode,
  style?: Object,
  width: number | string,
|};

type State = {|
  scrollTop: number,
  scrollUpdateWasRequested: boolean,
  startIndex: number,
  stopIndex: number,
|};

const defaultItemKey = (index: number) => index;

const RESET_POINTER_EVENTS_DEBOUNCE_INTERVAL = 150;

const hiddenDOMProperties = {
  hidden: true,
};

const invisibleDOMProperties = {
  hidden: true,
  rendersubtree: 'invisible',
};

const visibleDOMProperties = {
  rendersubtree: 'visible',
};

export default class List extends PureComponent<Props, State> {
  _innerRef: ?HTMLElement;
  _isDisplayLockingSupported: boolean = detectDisplayLockingSupport();
  _outerRef: ?HTMLElement;
  _prerenderOverscanRowsTimeoutID: TimeoutID | null = null;
  _resetPointerEventsTimeoutID: TimeoutID | null = null;

  // Always use explicit constructor for React components.
  // It produces less code after transpilation. (#26)
  // eslint-disable-next-line no-useless-constructor
  constructor(props: Props) {
    super(props);

    const { initialScrollOffset } = props;

    const scrollTop =
      typeof initialScrollOffset === 'number' ? initialScrollOffset : 0;

    const [startIndex, stopIndex] = this._getVisibleIndicesForOffset(scrollTop);

    this.state = {
      scrollTop,
      scrollUpdateWasRequested: typeof initialScrollOffset === 'number',
      startIndex,
      stopIndex,
    };
  }

  scrollTo(scrollTop: number): void {
    scrollTop = Math.max(0, scrollTop);

    this.setState(prevState => {
      if (prevState.scrollTop === scrollTop) {
        return null;
      }

      const [startIndex, stopIndex] = this._getVisibleIndicesForOffset(
        scrollTop
      );

      const isSubset =
        startIndex >= prevState.startIndex && stopIndex <= prevState.stopIndex;

      return {
        scrollTop: scrollTop,
        scrollUpdateWasRequested: true,
        startIndex: isSubset ? prevState.startIndex : startIndex,
        stopIndex: isSubset ? prevState.stopIndex : stopIndex,
      };
    });
  }

  scrollToItem(index: number, align: ?ScrollToAlign = 'smart'): void {
    const { height, itemCount, itemSize } = this.props;
    const { scrollTop } = this.state;

    index = Math.max(0, Math.min(index, itemCount - 1));

    const lastItemOffset = Math.max(0, itemCount * itemSize - height);
    const maxOffset = Math.min(lastItemOffset, index * itemSize);
    const minOffset = Math.max(0, index * itemSize - height + itemSize);

    if (align === 'smart') {
      if (scrollTop >= minOffset - height && scrollTop <= maxOffset + height) {
        align = 'minimum';
      } else {
        align = 'center';
      }
    }

    switch (align) {
      case 'start':
        this.scrollTo(maxOffset);
        break;
      case 'end':
        this.scrollTo(minOffset);
        break;
      case 'center':
        // "Centered" offset is usually the average of the min and max.
        // But near the edges of the list, this doesn't hold true.
        const middleOffset = Math.round(
          minOffset + (maxOffset - minOffset) / 2
        );
        if (middleOffset < Math.ceil(height / 2)) {
          this.scrollTo(0); // near the beginning
        } else if (middleOffset > lastItemOffset + Math.floor(height / 2)) {
          this.scrollTo(lastItemOffset); // near the end
        } else {
          this.scrollTo(middleOffset);
        }
        break;
      case 'minimum':
      default:
        if (scrollTop >= minOffset && scrollTop <= maxOffset) {
          this.scrollTo(scrollTop);
        } else if (scrollTop < minOffset) {
          this.scrollTo(minOffset);
        } else {
          this.scrollTo(maxOffset);
        }
        break;
    }
  }

  static getDerivedStateFromProps(
    nextProps: Props,
    prevState: State
  ): $Shape<State> | null {
    if (process.env.NODE_ENV !== 'production') {
      validateProps(nextProps);
    }
    return null;
  }

  componentDidMount() {
    this._commitHook();
  }

  componentDidUpdate() {
    this._commitHook();
  }

  componentWillUnmount() {
    if (this._resetPointerEventsTimeoutID !== null) {
      cancelTimeout(this._resetPointerEventsTimeoutID);
    }

    if (this._prerenderOverscanRowsTimeoutID !== null) {
      cancelTimeout(this._prerenderOverscanRowsTimeoutID);
    }
  }

  render() {
    const {
      className,
      height,
      innerElementType,
      itemCount,
      itemKey = defaultItemKey,
      itemSize,
      itemRenderer,
      outerElementType,
      style,
      width,
    } = this.props;
    const { scrollTop, startIndex, stopIndex } = this.state;

    const [
      visibleStartIndex,
      visibleStopIndex,
    ] = this._getVisibleIndicesForOffset(scrollTop);

    const items = [];
    if (itemCount > 0) {
      const itemStyleCache = this._getItemStyleCache(itemSize);

      for (let index = startIndex; index <= stopIndex; index++) {
        const isHidden = index < visibleStartIndex || index > visibleStopIndex;
        const isDisplayLocked = this._isDisplayLockingSupported && isHidden;

        const styleKey = isDisplayLocked ? `${index}!` : index;

        let style;
        if (itemStyleCache.hasOwnProperty(styleKey)) {
          style = itemStyleCache[styleKey];
        } else {
          style = {
            position: 'absolute',
            left: 0,
            top: index * itemSize,
            height: itemSize,
            width: '100%',
          };

          if (isDisplayLocked) {
            // Override default hidden style of display:none,
            // because it would interfere with the renderSubtree API.
            style.display = 'block';
          }

          itemStyleCache[styleKey] = style;
        }

        let domProperties;
        if (this._isDisplayLockingSupported) {
          domProperties = isHidden
            ? invisibleDOMProperties
            : visibleDOMProperties;
        } else {
          domProperties = isHidden ? hiddenDOMProperties : null;
        }

        items.push(
          itemRenderer({
            domProperties,
            key: itemKey(index),
            index,
            ref: isDisplayLocked
              ? this._refSetterForDisplayLockingOnly
              : undefined,
            style,
          })
        );
      }
    }

    return createElement(
      outerElementType || 'div',
      {
        className,
        onScroll: this._onScroll,
        ref: this._outerRefSetter,
        style: {
          position: 'relative',
          height,
          width,
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          willChange: 'transform',
          ...style,
        },
      },
      createElement(innerElementType || 'div', {
        children: items,
        ref: this._innerRefSetter,
        style: {
          height: itemSize * itemCount,
          width: '100%',

          // Note that it's more efficient to always render with pointer events disabled,
          // and avoid tracking an extra bit of "is scrolling" state.
          // After commit, we'll reset the style on a debounced.
          pointerEvents: 'none',
        },
      })
    );
  }

  _callOnItemsDisplayed: (startIndex: number, stopIndex: number) => void;
  _callOnItemsDisplayed = memoizeOne(
    (startIndex: number, stopIndex: number) => {
      const { onItemsDisplayed } = this.props;
      if (typeof onItemsDisplayed === 'function') {
        onItemsDisplayed(startIndex, stopIndex);
      }
    }
  );

  _commitHook() {
    const { itemCount, prerenderMode } = this.props;
    const { scrollTop, scrollUpdateWasRequested } = this.state;

    if (scrollUpdateWasRequested && this._outerRef != null) {
      const outerRef = ((this._outerRef: any): HTMLElement);
      outerRef.scrollTop = scrollTop;
    }

    if (itemCount > 0) {
      const [startIndex, stopIndex] = this._getVisibleIndicesForOffset(
        scrollTop
      );

      this._callOnItemsDisplayed(startIndex, stopIndex);
    }

    this._resetPointerEventsDebounced();

    // Schedule an update to pre-render rows at idle priority.
    // This will make the list more responsive to subsequent scrolling.
    if (typeof runWithPriority === 'function') {
      if (prerenderMode === 'idle') {
        this._prerenderOverscanRows();
      } else if (prerenderMode === 'idle+debounce') {
        this._prerenderOverscanRowsDebounced();
      }
    }
  }

  // Lazily create and cache item styles while scrolling,
  // So that pure component sCU will prevent re-renders.
  // We maintain this cache, and pass a size prop rather than index,
  // So that List can clear cached styles and force item re-render if necessary
  _getItemStyleCache: (itemSize: number) => ItemStyleCache;
  _getItemStyleCache = memoizeOne((itemSize: number) => ({}));

  _getVisibleIndicesForOffset(scrollTop: number): [number, number] {
    const { height, itemCount, itemSize } = this.props;

    if (itemCount === 0) {
      return [0, 0];
    }

    const startIndex = Math.max(
      0,
      Math.min(itemCount - 1, Math.floor(scrollTop / itemSize))
    );

    const firstItemOffset = startIndex * itemSize;
    const numVisibleItems = Math.ceil(
      (height + scrollTop - firstItemOffset) / itemSize
    );
    const stopIndex = Math.max(
      0,
      Math.min(
        itemCount - 1,
        startIndex + numVisibleItems - 1 // -1 is because stop index is inclusive
      )
    );

    // Overscan by one item in each direction so that tab/focus works.
    // If there isn't at least one extra item, tab loops back around.
    return [
      Math.max(0, startIndex - 1),
      Math.max(0, Math.min(itemCount - 1, stopIndex + 1)),
    ];
  }

  _innerRefSetter = (ref: any): void => {
    const { innerRef } = this.props;

    this._innerRef = ((ref: any): HTMLElement);

    if (typeof innerRef === 'function') {
      innerRef(ref);
    } else if (
      innerRef != null &&
      typeof innerRef === 'object' &&
      innerRef.hasOwnProperty('current')
    ) {
      innerRef.current = ref;
    }
  };

  _onScroll = (event: ScrollEvent): void => {
    const { clientHeight, scrollHeight, scrollTop } = event.currentTarget;
    const { onScroll } = this.props;

    // Scroll events should be processed as quickly as possible, even in concurrent mode, to avoid checkerboarding.
    // Wrapping the onScroll callback as well ensures that any rendering it schedules is included in this batch.
    flushSync(() => {
      if (typeof onScroll === 'function') {
        onScroll(event);
      }

      this.setState(prevState => {
        // Prevent Safari's elastic scrolling from causing visual shaking when scrolling past bounds.
        const maxScrollOffset = Math.min(
          scrollTop,
          scrollHeight - clientHeight
        );
        const safeScrollTop = Math.max(0, maxScrollOffset);

        if (prevState.scrollTop === safeScrollTop) {
          // Scroll position may have been updated by cDM/cDU,
          // In which case we don't need to trigger another render,
          return null;
        }

        const [startIndex, stopIndex] = this._getVisibleIndicesForOffset(
          safeScrollTop
        );

        const isSubset =
          startIndex >= prevState.startIndex &&
          stopIndex <= prevState.stopIndex;

        return {
          scrollTop: safeScrollTop,
          scrollUpdateWasRequested: true,
          startIndex: isSubset ? prevState.startIndex : startIndex,
          stopIndex: isSubset ? prevState.stopIndex : stopIndex,
        };
      });
    });
  };

  _outerRefSetter = (ref: any): void => {
    const { outerRef } = this.props;

    this._outerRef = ((ref: any): HTMLElement);

    if (typeof outerRef === 'function') {
      outerRef(ref);
    } else if (
      outerRef != null &&
      typeof outerRef === 'object' &&
      outerRef.hasOwnProperty('current')
    ) {
      outerRef.current = ref;
    }
  };

  _prerenderOverscanRowsDebounced() {
    if (this._prerenderOverscanRowsTimeoutID !== null) {
      cancelTimeout(this._prerenderOverscanRowsTimeoutID);
    }

    this._prerenderOverscanRowsTimeoutID = requestTimeout(
      this._prerenderOverscanRows,
      RESET_POINTER_EVENTS_DEBOUNCE_INTERVAL
    );
  }

  _prerenderOverscanRows = () => {
    this._prerenderOverscanRowsTimeoutID = null;

    runWithPriority(IdlePriority, () => {
      this.setState(prevState => {
        const {
          itemCount,
          maxNumPrerenderRows = DEFAULT_MAX_NUM_PRERENDER_ROWS,
        } = this.props;

        const [startIndex, stopIndex] = this._getVisibleIndicesForOffset(
          prevState.scrollTop
        );

        const numRowsPerViewport = stopIndex - startIndex;
        const numPrerenderRows = Math.min(
          numRowsPerViewport,
          maxNumPrerenderRows
        );

        const nextStartIndex = Math.max(0, startIndex - numPrerenderRows);
        const nextStopIndex = Math.min(
          itemCount - 1,
          stopIndex + numPrerenderRows
        );

        if (
          prevState.startIndex === nextStartIndex &&
          prevState.stopIndex === nextStopIndex
        ) {
          return null;
        }

        return {
          startIndex: nextStartIndex,
          stopIndex: nextStopIndex,
        };
      });
    });
  };

  _refSetterForDisplayLockingOnly = (ref: any): void => {
    // If the browser supports the display locking API,
    // tell it to do work in the background to prepare the display locked row.
    if (this._isDisplayLockingSupported) {
      if (ref != null && ref.hidden) {
        ref.updateRendering();
      }
    }
  };

  _resetPointerEventsDebounced() {
    if (this._resetPointerEventsTimeoutID !== null) {
      cancelTimeout(this._resetPointerEventsTimeoutID);
    }

    this._resetPointerEventsTimeoutID = requestTimeout(
      this._resetPointerEvents,
      RESET_POINTER_EVENTS_DEBOUNCE_INTERVAL
    );
  }

  _resetPointerEvents = () => {
    this._resetPointerEventsTimeoutID = null;

    // Resetting pointer events doesn't require a cascading render.
    if (
      this._innerRef != null &&
      this._innerRef.style.pointerEvents === 'none'
    ) {
      this._innerRef.style.pointerEvents = 'auto';
    }

    // Clear style cache after scrolling has stopped.
    // This enables us to cache during the most perfrormance sensitive times (when scrolling)
    // while also preventing the cache from growing unbounded.
    this._getItemStyleCache(-1);
  };
}

let validateProps = ((null: any): (props: Props) => void);
if (process.env.NODE_ENV !== 'production') {
  validateProps = ({ height, itemRenderer, itemSize }: Props): void => {
    if (typeof itemRenderer !== 'function') {
      throw Error(
        'An invalid "itemRenderer" prop has been specified. ' +
          'Value should be a function that returns React elements. ' +
          `"${
            itemRenderer === null ? 'null' : typeof itemRenderer
          }" was specified.`
      );
    }

    if (typeof itemSize !== 'number') {
      throw Error(
        'An invalid "itemSize" prop has been specified. ' +
          'Value should be a number. ' +
          `"${itemSize === null ? 'null' : typeof itemSize}" was specified.`
      );
    }

    if (typeof height !== 'number') {
      throw Error(
        'An invalid "height" prop has been specified. ' +
          'Lists must specify a number for height. ' +
          `"${height === null ? 'null' : typeof height}" was specified.`
      );
    }
  };
}
