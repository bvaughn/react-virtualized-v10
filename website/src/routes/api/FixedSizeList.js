import React, { Fragment } from 'react';
import { NavLink as Link } from 'react-router-dom';
import CodeBlock from '../../components/CodeBlock';
import ComponentApi from '../../components/ComponentApi';

import styles from './shared.module.css';

import CODE_CHILDREN_CLASS from '../../code/FixedSizeListChildrenClass.js';
import CODE_CHILDREN_FUNCTION from '../../code/FixedSizeListChildrenFunction.js';
import CODE_ITEM_DATA from '../../code/FixedSizeListItemData.js';
import CODE_ITEM_KEY from '../../code/FixedSizeListItemKey.js';
import CODE_ON_ITEMS_RENDERED from '../../code/FixedSizeListOnItemsRendered.js';
import CODE_ON_SCROLL from '../../code/FixedSizeListOnScroll.js';

export default () => (
  <ComponentApi methods={METHODS} name="FixedSizeList" props={PROPS} />
);

const PROPS = [
  {
    description: (
      <Fragment>
        <p>
          React component responsible for rendering the individual item
          specified by an <code>index</code> prop. This component also receives
          a <code>style</code> prop (used for positioning).
        </p>
        <p>
          If <code>useIsScrolling</code> is enabled for the list, the component
          also receives an additional <code>isScrolling</code> boolean prop.
        </p>
        <p>Function components are useful for rendering simple items:</p>
        <div className={styles.CodeBlockWrapper}>
          <CodeBlock value={CODE_CHILDREN_FUNCTION} />
        </div>
        <p>
          To render more complex items, you may wish to extend{' '}
          <code>PureComponent</code> to avoid unnecessary re-renders:
        </p>
        <div className={styles.CodeBlockWrapper}>
          <CodeBlock value={CODE_CHILDREN_CLASS} />
        </div>
      </Fragment>
    ),
    isRequired: true,
    name: 'children',
    type: 'component',
  },
  {
    defaultValue: '""',
    description: (
      <p>
        Optional CSS class to attach to outermost <code>&lt;div&gt;</code>{' '}
        element.
      </p>
    ),
    name: 'className',
    type: 'string',
  },
  {
    defaultValue: '"ltr"',
    description: (
      <Fragment>
        <p>Determines the direction of text and horizontal scrolling.</p>
        <ul>
          <li>ltr (default)</li>
          <li>rtl</li>
        </ul>
        <p>
          This property also automatically sets the{' '}
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/CSS/direction"
            target="_blank"
            rel="noopener noreferrer"
          >
            CSS <code>direction</code> style
          </a>{' '}
          for the list component.
        </p>
      </Fragment>
    ),
    name: 'direction',
    type: 'string',
  },
  {
    description: (
      <Fragment>
        <p>Height of the list.</p>
        <p>
          For vertical lists, this must be a number. It affects the number of
          rows that will be rendered (and displayed) at any given time.
        </p>
        <p>
          For horizontal lists, this can be a number or a string (e.g. "50%").
        </p>
      </Fragment>
    ),
    isRequired: true,
    name: 'height',
    type: 'number | string',
  },
  {
    defaultValue: 0,
    description: (
      <Fragment>
        <p>Scroll offset for initial render.</p>
        <p>
          For vertical lists, this affects <code>scrollTop</code>. For
          horizontal lists, this affects <code>scrollLeft</code>.
        </p>
      </Fragment>
    ),
    name: 'initialScrollOffset',
    type: 'number',
  },
  {
    description: (
      <p>
        Ref to attach to the inner container element. This is an advanced
        property.
      </p>
    ),
    name: 'innerRef',
    type: 'function | createRef object',
  },
  {
    defaultValue: '"div"',
    description: (
      <p>
        Tag name passed to <code>document.createElement</code> to create the
        inner container element. This is an advanced property; in most cases,
        the default ("div") should be used.
      </p>
    ),
    name: 'innerElementType',
    type: 'React$ElementType',
  },
  {
    description: (
      <p>
        <strong className={styles.DeprecatedProp}>
          This property has been deprecated.
        </strong>{' '}
        Please use the <code>innerElementType</code> prop instead.
      </p>
    ),
    name: 'innerTagName',
    type: 'string',
  },
  {
    defaultValue: 150,
    description: (
      <p>
        The interval in ms since the last scroll event after which the
        <code>isScrolling</code> prop passed to <code>children</code> will
        switch back to <code>false</code>. Has no effect if the
        <code>useIsScrolling</code> option is not set.
      </p>
    ),
    name: 'isScrollingDebounceInterval',
    type: 'number',
  },
  {
    description: (
      <p>
        Total number of items in the list. Note that only a few items will be
        rendered and displayed at a time.
      </p>
    ),
    isRequired: true,
    name: 'itemCount',
    type: 'number',
  },
  {
    description: (
      <Fragment>
        <p>
          Contextual data to be passed to the item renderer as a{' '}
          <code>data</code> prop. This is a light-weight alternative to React's
          built-in context API.
        </p>
        <p>Item data is useful for item renderers that are class components.</p>
        <div className={styles.CodeBlockWrapper}>
          <CodeBlock value={CODE_ITEM_DATA} />
        </div>
      </Fragment>
    ),
    name: 'itemData',
    type: 'any',
  },
  {
    description: (
      <Fragment>
        <p>
          By default, lists will use an item's index as its{' '}
          <a href="https://reactjs.org/docs/lists-and-keys.html#keys">key</a>.
          This is okay if:
        </p>
        <ul>
          <li>Your collections of items is never sorted or modified</li>
          <li>
            Your item renderer is not stateful and does not extend{' '}
            <code>PureComponent</code>
          </li>
        </ul>
        <p>
          If your list does not satisfy the above constraints, use the{' '}
          <code>itemKey</code> property to specify your own keys for items:
        </p>
        <div className={styles.CodeBlockWrapper}>
          <CodeBlock value={CODE_ITEM_KEY} />
        </div>
      </Fragment>
    ),
    isRequired: false,
    name: 'itemKey',
    type: 'function',
  },
  {
    description: (
      <p>
        Size of a item in the direction being windowed. For vertical lists, this
        is the row height. For horizontal lists, this is the column width.
      </p>
    ),
    isRequired: true,
    name: 'itemSize',
    type: 'number',
  },
  {
    defaultValue: '"vertical"',
    description: (
      <Fragment>
        <p>Layout/orientation of the list. Acceptable values are:</p>
        <ul>
          <li>vertical (default) - Up/down scrolling.</li>
          <li>horizontal - Left/right scrolling.</li>
        </ul>
        <p>
          Note that lists may scroll in both directions (depending on CSS) but
          content will only be windowed in the layout direction specified.
        </p>
      </Fragment>
    ),
    name: 'layout',
    type: 'string',
  },
  {
    description: (
      <Fragment>
        <p>Called when the range of items rendered by the list changes.</p>
        <p>
          This callback will only be called when item indices change. It will
          not be called if items are re-rendered for other reasons (e.g. a
          change in <code>isScrolling</code> or <code>data</code> params).
        </p>
        <p>
          The <code>visibleStartIndex</code> and <code>visibleStopIndex</code>
          parameters are the first and last index currently visible, including
          items that are partially visible. Note that scrolling a
          partially-visible item into full visibility might not trigger this
          callback because the item indices might not change.
        </p>
        <div className={styles.CodeBlockWrapper}>
          <CodeBlock value={CODE_ON_ITEMS_RENDERED} />
        </div>
      </Fragment>
    ),
    name: 'onItemsRendered',
    type: 'function',
  },
  {
    description: (
      <Fragment>
        <p>
          Called when the list scroll positions changes, as a result of user
          scrolling or scroll-to method calls.
        </p>
        <div className={styles.CodeBlockWrapper}>
          <CodeBlock value={CODE_ON_SCROLL} />
        </div>
      </Fragment>
    ),
    name: 'onScroll',
    type: 'function',
  },
  {
    description: (
      <p>
        Ref to attach to the outer container element. This is an advanced
        property.
      </p>
    ),
    name: 'outerRef',
    type: 'function | createRef object',
  },
  {
    defaultValue: '"div"',
    description: (
      <p>
        Tag name passed to <code>document.createElement</code> to create the
        outer container element. This is an advanced property; in most cases,
        the default ("div") should be used.
      </p>
    ),
    name: 'outerElementType',
    type: 'React$ElementType',
  },
  {
    description: (
      <p>
        <strong className={styles.DeprecatedProp}>
          This property has been deprecated.
        </strong>{' '}
        Please use the <code>outerElementType</code> prop instead.
      </p>
    ),
    name: 'outerTagName',
    type: 'string',
  },
  {
    defaultValue: 2,
    description: (
      <Fragment>
        <p>
          The number of items (rows or columns) to render outside of the visible
          area. This property can be important for two reasons:
        </p>
        <ul>
          <li>
            Overscanning by one row or column allows the tab key to focus on the
            next (not yet visible) item.
          </li>
          <li>
            Overscanning slightly can reduce or prevent a flash of empty space
            when a user first starts scrolling.
          </li>
        </ul>
        <p>
          Note that overscanning too much can negatively impact performance. To
          support tabbing and accessibility, List will overscan at least one
          item, even if this value is set to zero. When items are partially
          visible at the start and/or end of the viewport, overscanning starts
          after the partially visible items.
        </p>
      </Fragment>
    ),
    name: 'overscanCount',
    type: 'number',
  },
  {
    defaultValue: null,
    description: (
      <p>
        Optional inline style to attach to outermost <code>&lt;div&gt;</code>{' '}
        element.
      </p>
    ),
    name: 'style',
    type: 'Object',
  },
  {
    defaultValue: false,
    description: (
      <Fragment>
        <p>
          Adds an additional <code>isScrolling</code> parameter to the{' '}
          <code>children</code> render function. This parameter can be used to
          show a placeholder row or column while the list is being scrolled.
        </p>
        <p>
          Note that using this parameter will result in an additional render
          call after scrolling has stopped (when <code>isScrolling</code>{' '}
          changes from true to false).
        </p>
        <p>
          <Link to="/examples/list/scrolling-indicators">
            See here for an example of this API.
          </Link>
        </p>
      </Fragment>
    ),
    name: 'useIsScrolling',
    type: 'boolean',
  },
  {
    description: (
      <Fragment>
        <p>Width of the list.</p>
        <p>
          For horizontal lists, this must be a number. It affects the number of
          columns that will be rendered (and displayed) at any given time.
        </p>
        <p>
          For vertical lists, this can be a number or a string (e.g. "50%").
        </p>
      </Fragment>
    ),
    isRequired: true,
    name: 'width',
    type: 'number | string',
  },
];

const METHODS = [
  {
    description: (
      <p>
        Scroll to the specified offset (<code>scrollTop</code> or{' '}
        <code>scrollLeft</code>, depending on the <code>direction</code> prop).
      </p>
    ),
    signature: 'scrollTo(scrollOffset: number): void',
  },
  {
    description: (
      <Fragment>
        <p>Scroll to the specified item.</p>
        <p>
          By default, the List will scroll as little as possible to ensure the
          item is visible. You can control the alignment of the item though by
          specifying a second alignment parameter. Acceptable values are:
        </p>
        <ul>
          <li>
            auto (default) - Scroll as little as possible to ensure the item is
            fully visible. If the item is already fully visible, it won't scroll
            at all.
          </li>
          <li>
            smart - If the item is already fully visible, don't scroll at all.
            If it's less than one viewport away, scroll as little as possible so
            that it becomes visible. If it is more than one viewport away,
            scroll so that it is centered within the list.
          </li>
          <li>center - Center align the item within the list.</li>
          <li>
            end - Align the item to the end of the list (the bottom for vertical
            lists or the right for horizontal lists).
          </li>
          <li>
            start - Align the item to the beginning of the list (the top for
            vertical lists or the left for horizontal lists).
          </li>
        </ul>
        <p>
          <Link to="/examples/list/scroll-to-item">
            See here for an example of this API.
          </Link>
        </p>
      </Fragment>
    ),
    signature: 'scrollToItem(index: number, align: string = "auto"): void',
  },
];
