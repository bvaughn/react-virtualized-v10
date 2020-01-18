import { SimpleList as List } from 'react-window';

// In this example "itemsArray" is an Array of strings
// It could bea ny other type of data (e.g. Set, iterable, sparse list).
function Example({ itemsArray }) {
  return (
    <List
      height={150}
      itemCount={itemsArray.length}
      itemRenderer={({ domProperties, index, key, style }) => {
        // "key" is used by React to more efficiently update the row.
        // "style" is provided by react-window to position the row.
        // "domProperties" sohuld be spread onto the top level DOM element(s).
        // "index" specifies which item this row should render.
        return (
          <div key={key} style={style} {...domProperties}>
            {itemsArray[index]}
          </div>
        );
      }}
      itemSize={35}
      width={300}
    />
  );
}