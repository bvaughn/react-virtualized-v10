// @flow

import { createElement } from 'react';

import createListComponent, { defaultItemKey } from './createListComponent';
import ItemMeasurer from './ItemMeasurer';

import type { Props, ScrollToAlign } from './createListComponent';

const DEFAULT_ESTIMATED_ITEM_SIZE = 50;

type DynanmicProps = {|
  estimatedItemSize: number,
  ...Props<any>,
|};

export type HandleNewMeasurements = (
  index: number,
  newSize: number,
  isFirstMeasureAfterMounting: boolean
) => void;

type ItemMetadata = {|
  offset: number,
  size: number,
|};
type InstanceProps = {|
  estimatedItemSize: number,
  instance: any,
  itemOffsetMap: { [index: number]: number },
  itemSizeMap: { [index: number]: number },
  lastMeasuredIndex: number,
  lastPositionedIndex: number,
  totalMeasuredSize: number,
|};

const getItemMetadata = (
  props: Props<any>,
  index: number,
  instanceProps: InstanceProps
): ItemMetadata => {
  const {
    estimatedItemSize,
    instance,
    itemOffsetMap,
    itemSizeMap,
    lastMeasuredIndex,
    lastPositionedIndex,
  } = instanceProps;

  // If the specified item has not yet been measured,
  // Just return an estimated size for now.
  if (index > lastMeasuredIndex) {
    return {
      offset: 0,
      size: estimatedItemSize,
    };
  }

  // Lazily update positions if they are stale.
  if (index > lastPositionedIndex) {
    if (lastPositionedIndex < 0) {
      itemOffsetMap[0] = 0;
    }

    for (let i = Math.max(1, lastPositionedIndex + 1); i <= index; i++) {
      const prevOffset = itemOffsetMap[i - 1];

      // In some browsers (e.g. Firefox) fast scrolling may skip rows.
      // In this case, our assumptions about last measured indices may be incorrect.
      // Handle this edge case to prevent NaN values from breaking styles.
      // Slow scrolling back over these skipped rows will adjust their sizes.
      const prevSize = itemSizeMap[i - 1] || 0;

      itemOffsetMap[i] = prevOffset + prevSize;

      // Reset cached style to clear stale position.
      delete instance._itemStyleCache[i];
    }

    instanceProps.lastPositionedIndex = index;
  }

  let offset = itemOffsetMap[index];
  let size = itemSizeMap[index];

  return { offset, size };
};

const findNearestItemBinarySearch = (
  props: Props<any>,
  instanceProps: InstanceProps,
  high: number,
  low: number,
  offset: number
): number => {
  while (low <= high) {
    const middle = low + Math.floor((high - low) / 2);
    const currentOffset = getItemMetadata(props, middle, instanceProps).offset;

    if (currentOffset === offset) {
      return middle;
    } else if (currentOffset < offset) {
      low = middle + 1;
    } else if (currentOffset > offset) {
      high = middle - 1;
    }
  }

  if (low > 0) {
    return low - 1;
  } else {
    return 0;
  }
};

const getEstimatedTotalSize = (
  { itemCount }: Props<any>,
  {
    itemSizeMap,
    estimatedItemSize,
    lastMeasuredIndex,
    totalMeasuredSize,
  }: InstanceProps
) =>
  totalMeasuredSize + (itemCount - lastMeasuredIndex - 1) * estimatedItemSize;

const DynamicSizeList = createListComponent({
  getItemOffset: (
    props: Props<any>,
    index: number,
    instanceProps: InstanceProps
  ): number => getItemMetadata(props, index, instanceProps).offset,

  getItemSize: (
    props: Props<any>,
    index: number,
    instanceProps: InstanceProps
  ): ?number => {
    // Do not hard-code item dimensions.
    // We don't know them initially.
    // Even once we do, changes in item content or list size should reflow.
    return undefined;
  },

  getEstimatedTotalSize,

  getOffsetForIndexAndAlignment: (
    props: Props<any>,
    index: number,
    align: ScrollToAlign,
    scrollOffset: number,
    instanceProps: InstanceProps
  ): number => {
    const { direction, layout, height, width } = props;

    if (process.env.NODE_ENV !== 'production') {
      const { lastMeasuredIndex } = instanceProps;
      if (index > lastMeasuredIndex) {
        console.warn(
          `DynamicSizeList does not support scrolling to items that yave not yet measured. ` +
            `scrollToItem() was called with index ${index} but the last measured item was ${lastMeasuredIndex}.`
        );
      }
    }

    const size = (((direction === 'horizontal' || layout === 'horizontal'
      ? width
      : height): any): number);
    const itemMetadata = getItemMetadata(props, index, instanceProps);

    // Get estimated total size after ItemMetadata is computed,
    // To ensure it reflects actual measurements instead of just estimates.
    const estimatedTotalSize = getEstimatedTotalSize(props, instanceProps);

    const maxOffset = Math.min(estimatedTotalSize - size, itemMetadata.offset);
    const minOffset = Math.max(
      0,
      itemMetadata.offset - size + itemMetadata.size
    );

    switch (align) {
      case 'start':
        return maxOffset;
      case 'end':
        return minOffset;
      case 'center':
        return Math.round(minOffset + (maxOffset - minOffset) / 2);
      case 'auto':
      default:
        if (scrollOffset >= minOffset && scrollOffset <= maxOffset) {
          return scrollOffset;
        } else if (scrollOffset - minOffset < maxOffset - scrollOffset) {
          return minOffset;
        } else {
          return maxOffset;
        }
    }
  },

  getStartIndexForOffset: (
    props: Props<any>,
    offset: number,
    instanceProps: InstanceProps
  ): number => {
    const { lastMeasuredIndex, totalMeasuredSize } = instanceProps;

    // If we've already positioned and measured past this point,
    // Use a binary search to find the closets cell.
    if (offset <= totalMeasuredSize) {
      return findNearestItemBinarySearch(
        props,
        instanceProps,
        lastMeasuredIndex,
        0,
        offset
      );
    }

    // Otherwise render a new batch of items starting from where we left off.
    return lastMeasuredIndex + 1;
  },

  getStopIndexForStartIndex: (
    props: Props<any>,
    startIndex: number,
    scrollOffset: number,
    instanceProps: InstanceProps
  ): number => {
    const { direction, layout, height, itemCount, width } = props;

    const size = (((direction === 'horizontal' || layout === 'horizontal'
      ? width
      : height): any): number);
    const itemMetadata = getItemMetadata(props, startIndex, instanceProps);
    const maxOffset = scrollOffset + size;

    let offset = itemMetadata.offset + itemMetadata.size;
    let stopIndex = startIndex;

    while (stopIndex < itemCount - 1 && offset < maxOffset) {
      stopIndex++;
      offset += getItemMetadata(props, stopIndex, instanceProps).size;
    }

    return stopIndex;
  },

  initInstanceProps(props: Props<any>, instance: any): InstanceProps {
    const { estimatedItemSize } = ((props: any): DynanmicProps);

    const instanceProps = {
      estimatedItemSize: estimatedItemSize || DEFAULT_ESTIMATED_ITEM_SIZE,
      instance,
      itemOffsetMap: {},
      itemSizeMap: {},
      lastMeasuredIndex: -1,
      lastPositionedIndex: -1,
      totalMeasuredSize: 0,
    };

    let debounceForceUpdateID = null;
    const debounceForceUpdate = () => {
      if (debounceForceUpdateID === null) {
        debounceForceUpdateID = setTimeout(() => {
          debounceForceUpdateID = null;
          instance.forceUpdate();
        }, 1);
      }
    };

    // This method is called before unmounting.
    instance._unmountHook = () => {
      if (debounceForceUpdateID !== null) {
        clearTimeout(debounceForceUpdateID);
        debounceForceUpdateID = null;
      }
    };

    let hasNewMeasurements: boolean = false;
    let sizeDeltaTotal = 0;

    // This method is called after mount and update.
    instance._commitHook = () => {
      if (hasNewMeasurements) {
        hasNewMeasurements = false;

        // Edge case where cell sizes changed, but cancelled each other out.
        // We still need to re-render in this case,
        // Even though we don't need to adjust scroll offset.
        if (sizeDeltaTotal === 0) {
          instance.forceUpdate();
          return;
        }

        let shouldForceUpdate;

        // In the setState commit hook, we'll decrement sizeDeltaTotal.
        // In case the state update is processed synchronously,
        // And triggers additional size updates itself,
        // We should only drecement by the amount we updated state for originally.
        const sizeDeltaForStateUpdate = sizeDeltaTotal;

        // If the user is scrolling up, we need to adjust the scroll offset,
        // To prevent items from "jumping" as items before them have been resized.
        instance.setState(
          prevState => {
            if (
              prevState.scrollDirection === 'backward' &&
              !prevState.scrollUpdateWasRequested
            ) {
              // TRICKY
              // If item(s) have changed size since they were last displayed, content will appear to jump.
              // To avoid this, we need to make small adjustments as a user scrolls to preserve apparent position.
              // This also ensures that the first item eventually aligns with scroll offset 0.
              return {
                scrollOffset: prevState.scrollOffset + sizeDeltaForStateUpdate,
              };
            } else {
              // There's no state to update,
              // But we still want to re-render in this case.
              shouldForceUpdate = true;

              return null;
            }
          },
          () => {
            if (shouldForceUpdate) {
              instance.forceUpdate();
            } else {
              const { scrollOffset } = instance.state;
              const { direction, layout } = instance.props;

              // Adjusting scroll offset directly interrupts smooth scrolling for some browsers (e.g. Firefox).
              // The relative scrollBy() method doesn't interrupt (or at least it won't as of Firefox v65).
              // Other browsers (e.g. Chrome, Safari) seem to handle both adjustments equally well.
              // See https://bugzilla.mozilla.org/show_bug.cgi?id=1502059
              const element = ((instance._outerRef: any): HTMLDivElement);
              // $FlowFixMe Property scrollBy is missing in HTMLDivElement
              if (typeof element.scrollBy === 'function') {
                element.scrollBy(
                  direction === 'horizontal' || layout === 'horizontal'
                    ? sizeDeltaForStateUpdate
                    : 0,
                  direction === 'horizontal' || layout === 'horizontal'
                    ? 0
                    : sizeDeltaForStateUpdate
                );
              } else if (
                direction === 'horizontal' ||
                layout === 'horizontal'
              ) {
                element.scrollLeft = scrollOffset;
              } else {
                element.scrollTop = scrollOffset;
              }
            }

            sizeDeltaTotal -= sizeDeltaForStateUpdate;
          }
        );
      }
    };

    // This function may be called out of order!
    // It is not safe to reposition items here.
    // Be careful when comparing index and lastMeasuredIndex.
    const handleNewMeasurements: HandleNewMeasurements = (
      index: number,
      newSize: number,
      isFirstMeasureAfterMounting: boolean
    ) => {
      const {
        itemSizeMap,
        lastMeasuredIndex,
        lastPositionedIndex,
      } = instanceProps;

      // In some browsers (e.g. Firefox) fast scrolling may skip rows.
      // In this case, our assumptions about last measured indices may be incorrect.
      // Handle this edge case to prevent NaN values from breaking styles.
      // Slow scrolling back over these skipped rows will adjust their sizes.
      const oldSize = itemSizeMap[index] || 0;

      // Mark offsets after this as stale so that getItemMetadata() will lazily recalculate it.
      if (index < lastPositionedIndex) {
        instanceProps.lastPositionedIndex = index;
      }

      if (index <= lastMeasuredIndex) {
        if (oldSize === newSize) {
          return;
        }

        // Adjust total size estimate by the delta in size.
        instanceProps.totalMeasuredSize += newSize - oldSize;

        // Record the size delta here in case the user is scrolling up.
        // In that event, we need to adjust the scroll offset by thie amount,
        // To prevent items from "jumping" as items before them are resized.
        // We only do this for items that are newly measured (after mounting).
        // Ones that change size later do not need to affect scroll offset.
        if (isFirstMeasureAfterMounting) {
          sizeDeltaTotal += newSize - oldSize;
        }
      } else {
        instanceProps.lastMeasuredIndex = index;
        instanceProps.totalMeasuredSize += newSize;
      }

      itemSizeMap[index] = newSize;

      // Even though the size has changed, we don't need to reset the cached style,
      // Because dynamic list items don't have constrained sizes.
      // This enables them to resize when their content (or container size) changes.
      // It also lets us avoid an unnecessary render in this case.

      if (isFirstMeasureAfterMounting) {
        hasNewMeasurements = true;
      } else {
        debounceForceUpdate();
      }
    };
    instance._handleNewMeasurements = handleNewMeasurements;

    // Override the item-rendering process to wrap items with ItemMeasurer.
    // This keep the external API simpler.
    instance._renderItems = () => {
      const {
        children,
        direction,
        layout,
        itemCount,
        itemData,
        itemKey = defaultItemKey,
        useIsScrolling,
      } = instance.props;
      const { isScrolling } = instance.state;

      const [startIndex, stopIndex] = instance._getRangeToRender();

      const items = [];
      if (itemCount > 0) {
        for (let index = startIndex; index <= stopIndex; index++) {
          const { size } = getItemMetadata(
            instance.props,
            index,
            instanceProps
          );

          // It's important to read style after fetching item metadata.
          // getItemMetadata() will clear stale styles.
          const style = instance._getItemStyle(index);

          const item = createElement(children, {
            data: itemData,
            index,
            isScrolling: useIsScrolling ? isScrolling : undefined,
            style,
          });

          // Always wrap children in a ItemMeasurer to detect changes in size.
          items.push(
            createElement(ItemMeasurer, {
              direction,
              layout,
              handleNewMeasurements,
              index,
              item,
              key: itemKey(index, itemData),
              size,
            })
          );
        }
      }
      return items;
    };

    return instanceProps;
  },

  shouldResetStyleCacheOnItemSizeChange: false,

  validateProps: ({ itemSize }: Props<any>): void => {
    if (process.env.NODE_ENV !== 'production') {
      if (itemSize !== undefined) {
        throw Error('An unexpected "itemSize" prop has been provided.');
      }
    }
  },
});

export default DynamicSizeList;
