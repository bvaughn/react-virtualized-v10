import { DynamicSizeList as List } from 'react-window';

// This example assumes 'items' is an array of strings.
// Your application may render a more complex item,
// Like the one shown in this demo.
const Column = ({ index, style }) => (
  <div style={style}>items[index]</div>
);

// Note that no itemSize is required for dyanmic lists!
const Example = () => (
  <List
    layout="horizontal"
    height={50}
    itemCount={1000}
    width={300}
  >
    {Column}
  </List>
);
