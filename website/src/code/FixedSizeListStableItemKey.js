function itemKey(index, data, virtualizedIndex) {
  // virtualizedIndex is the current index relative to the first
  // rendered rows.

  // Using virtualizedIndex as the key will be stable even when 
  // the user scrolls allowing for DOM re-use.
  // When using sorting/filtering a visible element might need to be re-rendered if after
  // filtering/sorting the element is still visible but on a different position although
  // the chances of this happening get smaller the bigger the amount of items (as chances are 
  // that after sorting or filtering different items would be visible on the viewport anyway)
  // The same is true when the data changes causing new items to be added to the top
  return virtualizedIndex;
}