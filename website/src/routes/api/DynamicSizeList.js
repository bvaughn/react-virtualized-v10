import React, { Fragment } from 'react';
import { NavHashLink as Link } from 'react-router-hash-link';
import ComponentApi from '../../components/ComponentApi';

export default () => (
  <ComponentApi
    methods={METHODS}
    methodsIntro={
      <p>
        This component has the same methods as{' '}
        <Link to="/api/FixedSizeList#methods">
          <code>FixedSizeList</code>
        </Link>, but with the following exceptions:
      </p>
    }
    name="DynamicSizeList"
    props={PROPS}
    propsIntro={
      <p>
        This component has the same props as{' '}
        <Link to="/api/FixedSizeList#props">
          <code>FixedSizeList</code>
        </Link>, but with the following exceptions:
      </p>
    }
  />
);

const PROPS = [
  {
    description: (
      <Fragment>
        <p>
          Items within a dynamic list are automatically measured after
          rendering. This means that no <code>itemSize</code> prop is required.
        </p>
        <p>
          <strong>The list will error if you accidentally supply one.</strong>
        </p>
      </Fragment>
    ),
    name: 'itemSize',
    showWarning: true,
    type: 'number',
  },
];

const METHODS = [
  {
    description: (
      <Fragment>
        <p>
          Dynamic lists do not support scrolling to items that have not yet been
          rendered.
        </p>
        <p>
          <strong>
            Attempting to scroll to such an item will log a console warning.
          </strong>
        </p>
      </Fragment>
    ),
    signature: 'scrollToItem(index: number, align: string = "auto"): void',
    showWarning: true,
  },
];
