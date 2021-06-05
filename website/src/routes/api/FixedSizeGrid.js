import React, { Fragment } from 'react';
import { NavLink as Link } from 'react-router-dom';
import CodeBlock from '../../components/CodeBlock';
import ComponentApi from '../../components/ComponentApi';

import styles from './shared.module.css';

import CODE_CHILDREN_CLASS from '../../code/FixedSizeGridChildrenClass.js';
import CODE_CHILDREN_FUNCTION from '../../code/FixedSizeGridChildrenFunction.js';
import CODE_ITEM_DATA from '../../code/FixedSizeGridItemData.js';
import CODE_ITEM_KEY from '../../code/FixedSizeGridItemKey.js';
import CODE_ON_ITEMS_RENDERED from '../../code/FixedSizeGridOnItemsRendered.js';
import CODE_ON_SCROLL from '../../code/FixedSizeGridOnScroll.js';

export default () => (
  <ComponentApi methods={METHODS} name="FixedSizeGrid" props={PROPS} />
);

const PROPS = [
  {
    description: (
      <Fragment>
        <p>
          React component responsible for rendering the individual item
          specified by indices. This component receives a <code>style</code>{' '}
          prop (used for positioning).
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
    description: (
      <p>
        Number of columns in the grid. Note that only a few columns will be
        rendered and displayed at a time.
      </p>
    ),
    isRequired: true,
    name: 'columnCount',
    type: 'number',
  },
  {
    description: <p>Width of an individual column within the grid.</p>,
    isRequired: true,
    name: 'columnWidth',
    type: 'number',
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
          for the grid component.
        </p>
      </Fragment>
    ),
    name: 'direction',
    type: 'string',
  },
  {
    description: (
      <p>
        Height of the grid. This affects the number of rows that will be
        rendered (and displayed) at any given time.
      </p>
    ),
    isRequired: true,
    name: 'height',
    type: 'number',
  },
  {
    defaultValue: 0,
    description: <p>Horizontal scroll offset for initial render.</p>,
    name: 'initialScrollLeft',
    type: 'number',
  },
  {
    defaultValue: 0,
    description: <p>Vertical scroll offset for initial render.</p>,
    name: 'initialScrollTop',
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
          By default, grids will use an item's indices as its{' '}
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
          If your grid does not satisfy the above constraints, use the{' '}
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
      <Fragment>
        <p>Called when the range of items rendered by the grid changes.</p>
        <p>
          This callback will only be called when item indices change. It will
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
          Called when the grid scroll positions changes, as a result of user
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
    defaultValue: 'div',
    description: (
      <Fragment>
        <p>
          The number of columns to render outside of the visible area. This
          property can be important for two reasons:
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
          Note that overscanning too much can negatively impact performance. By
          default, grid overscans by one item.
        </p>
      </Fragment>
    ),
    name: 'overscanColumnCount',
    type: 'number',
  },
  {
    description: (
      <p>
        <strong className={styles.DeprecatedProp}>
          This property has been deprecated.
        </strong>{' '}
        Please use the <code>overscanColumnCount</code> property instead.
      </p>
    ),
    name: 'overscanColumnsCount',
    type: 'number',
  },
  {
    description: (
      <p>
        <strong className={styles.DeprecatedProp}>
          This property has been deprecated.
        </strong>{' '}
        Please use the <code>overscanColumnCount</code> and{' '}
        <code>overscanRowCount</code> properties instead.
      </p>
    ),
    name: 'overscanCount',
    type: 'number',
  },
  {
    defaultValue: 1,
    description: (
      <Fragment>
        <p>
          The number of rows to render outside of the visible area. This
          property can be important for two reasons:
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
          support tabbing and accessibility, Grid will overscan at least one
          item, even if this value is set to zero. When items are partially
          visible at the start and/or end of the viewport, overscanning starts
          after the partially visible items.
        </p>
      </Fragment>
    ),
    name: 'overscanRowCount',
    type: 'number',
  },
  {
    description: (
      <p>
        <strong className={styles.DeprecatedProp}>
          This property has been deprecated.
        </strong>{' '}
        Please use the <code>overscanRowCount</code> property instead.
      </p>
    ),
    name: 'overscanRowsCount',
    type: 'number',
  },
  {
    description: (
      <p>
        Number of rows in the grid. Note that only a few rows will be rendered
        and displayed at a time.
      </p>
    ),
    isRequired: true,
    name: 'rowCount',
    type: 'number',
  },
  {
    description: <p>Height of an individual row within the grid.</p>,
    isRequired: true,
    name: 'rowHeight',
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
      <p>
        Adds an additional <code>isScrolling</code> parameter to the{' '}
        <code>children</code> render function. This parameter can be used to
        show a placeholder row or column while the grid is being scrolled.
        <br />
        <br />
        Note that using this parameter will result in an additional render call
        after scrolling has stopped (when<code>isScrolling</code> changse from
        true to false).
        <br />
        <br />
        <Link to="/examples/list/scrolling-indicators">
          See here for an example of this API.
        </Link>
      </p>
    ),
    name: 'useIsScrolling',
    type: 'boolean',
  },
  {
    description: (
      <p>
        Width of the grid. This affects the number of columns that will be
        rendered (and displayed) at any given time.
      </p>
    ),
    isRequired: true,
    name: 'width',
    type: 'number',
  },
];

const METHODS = [
  {
    description: <p>Scroll to the specified offsets.</p>,
    signature: 'scrollTo({scrollLeft: number, scrollTop: number}): void',
  },
  {
    description: (
      <Fragment>
        <p>Scroll to the specified item.</p>
        <p>
          By default, the Grid will scroll as little as possible to ensure the
          item is visible. You can control the alignment of the item though by
          specifying an <code>align</code> property. Acceptable values are:
        </p>
        <ul>
          <li>
            <code>auto</code> (default) - Scroll as little as possible to ensure
            the item is visible. (If the item is already visible, it won't
            scroll at all.)
          </li>
          <li>
            smart - If the item is already fully visible, don't scroll at all.
            If it's less than one viewport away, scroll as little as possible so
            that it becomes visible. If it is more than one viewport away,
            scroll so that it is centered within the list.
          </li>
          <li>
            <code>center</code> - Center align the item within the grid.
          </li>
          <li>
            <code>end</code> - Align the item to the bottom, right hand side of
            the grid.
          </li>
          <li>
            <code>start</code> - Align the item to the top, left hand of the
            grid.
          </li>
        </ul>
        <p>
          If either <code>columnIndex</code> or <code>rowIndex</code> are
          omitted, <code>scrollLeft</code> or <code>scrollTop</code> will be
          unchanged (respectively).
        </p>
        <p>
          <Link to="/examples/list/scroll-to-item">
            See here for an example of this API.
          </Link>
        </p>
      </Fragment>
    ),
    signature:
      'scrollToItem({align: string = "auto", columnIndex?: number, rowIndex?: number }): void',
  },
];
