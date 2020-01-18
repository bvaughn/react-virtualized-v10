import React, { Fragment } from 'react';
import ReactDOM from 'react-dom';
import { DynamicSizeList as List } from 'react-window';
import loremIpsum from 'lorem-ipsum';

import './styles.css';

// Polyfill ResizeObserver for demo
if (typeof ResizeObserver === 'undefined') {
  global.ResizeObserver = require('resize-observer-polyfill').default;
}

// This example uses an array of random strings,
// But the list can also contain data that's async loaded, like images.
const items = new Array(500)
  .fill(true)
  .map(() => loremIpsum({ units: 'words', count: 3 }));

const Column = ({ data, index, style }) => (
  <div className={index % 2 ? 'ListItemOdd' : 'ListItemEven'} style={style}>
    {data[index]}
  </div>
);

const Example = () => (
  <Fragment>
    <List
      className="List"
      layout="horizontal"
      height={50}
      itemCount={items.length}
      itemData={items}
      width={300}
    >
      {Column}
    </List>
    <p>
      This component requires the{' '}
      <a href="https://wicg.github.io/ResizeObserver">ResizeObserver</a> API (or
      polyfill).
    </p>
  </Fragment>
);

ReactDOM.render(<Example />, document.getElementById('root'));
