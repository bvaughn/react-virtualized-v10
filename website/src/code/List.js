import { List } from 'react-window';

// In this example "itemsArray" is an Array of strings
// It could bea ny other type of data (e.g. Set, iterable, sparse list).
function Example({ itemsArray }) {
  return (
    <List
      width={300}
      height={150}
      itemCount={itemsArray.length}
      itemRenderer={({ index, ref, style }) =>
        // Every prop passed to the item renderer should be forwarded to our Row component.
        // One exception is the "ref" prop, which should be forwarded,
        // so that it gets attached to the outer HTML element that wraps the row.
        return (
          <Row
            forwardedRef={ref}
            index={index}
            itemsArray={itemsArray}
            style={style}
          />
        );
      }}
    />
  );
}

function Row({ forwardedRef, index, itemsArray, style }) {
  // The forwareded ref and style should be attached to the top HTML element.
  // The ref is used by List to measure row after it has rendered.
  // The style is used to position the row.
  return (
    <div ref={forwardedRef} style={style}>
      {itemsArray[index]}
    </div>
  );
}
