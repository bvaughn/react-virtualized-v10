import React, { Fragment } from 'react';
import { NavHashLink as Link } from 'react-router-hash-link';
import CodeBlock from '../../components/CodeBlock';
import ComponentApi from '../../components/ComponentApi';

import styles from './shared.module.css';

import CODE from '../../code/VariableSizeListItemSize.js';

export default () => (
  <ComponentApi
    methods={METHODS}
    methodsIntro={
      <p>
        This component has the same methods as{' '}
        <Link to="/api/FixedSizeList#methods">
          <code>FixedSizeList</code>
        </Link>, but with the following additions:
      </p>
    }
    name="VariableSizeList"
    props={PROPS}
    propsIntro={
      <p>
        This component has the same props as{' '}
        <Link to="/api/FixedSizeList#props">
          <code>FixedSizeList</code>
        </Link>, but with the following additions:
      </p>
    }
  />
);

const PROPS = [
  {
    defaultValue: 50,
    description: (
      <Fragment>
        <p>
          Estimated size of a item in the direction being windowed. For vertical
          lists, this is the row height. For horizontal lists, this is the
          column width.
        </p>
        <p>
          This value is used to calculated the estimated total size of a list
          before its items have all been measured. The total size impacts user
          scrolling behavior. It is updated whenever new items are measured.
        </p>
      </Fragment>
    ),
    isRequired: true,
    name: 'estimatedItemSize',
    type: 'number',
  },
  {
    description: (
      <Fragment>
        <p>
          Returns the size of a item in the direction being windowed. For
          vertical lists, this is the row height. For horizontal lists, this is
          the column width.
        </p>
        <div className={styles.CodeBlockWrapper}>
          <CodeBlock value={CODE} />
        </div>
      </Fragment>
    ),
    isRequired: true,
    name: 'itemSize',
    type: '(index: number) => number',
  },
];

const METHODS = [
  {
    description: (
      <Fragment>
        <p>
          <code>VariableSizeList</code> caches offsets and measurements for each
          index for performance purposes. This method clears that cached data
          for all items after (and including) the specified index. It should be
          called whenever a item's size changes. (Note that this is not a
          typical occurrance.)
        </p>
        <p>
          By default the list will automatically re-render after the index is
          reset. If you would like to delay this re-render until e.g. a state
          update has completed in the parent component, specify a value of
          <code>false</code>
          for the second, optional parameter.
        </p>
      </Fragment>
    ),
    signature:
      'resetAfterIndex(index: number, shouldForceUpdate?: boolean = true): void',
  },
];
