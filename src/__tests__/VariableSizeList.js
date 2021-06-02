import React, { createRef, PureComponent } from 'react';
import { render } from 'react-dom';
import { Simulate } from 'react-dom/test-utils';
import ReactTestRenderer from 'react-test-renderer';
import { VariableSizeList } from '..';

const simulateScroll = (instance, scrollOffset, direction = 'vertical') => {
  if (direction === 'horizontal') {
    instance._outerRef.scrollLeft = scrollOffset;
  } else {
    instance._outerRef.scrollTop = scrollOffset;
  }
  Simulate.scroll(instance._outerRef);
};

const findScrollContainer = rendered => rendered.root.children[0].children[0];

describe('VariableSizeList', () => {
  let itemRenderer, itemSize, defaultProps, onItemsRendered;

  // Use PureComponent to test memoization.
  // Pass through to itemRenderer mock for easier test assertions.
  class PureItemRenderer extends PureComponent {
    render() {
      return itemRenderer(this.props);
    }
  }

  beforeEach(() => {
    jest.useFakeTimers();

    // JSdom does not do actual layout and so doesn't return meaningful values here.
    // For the purposes of our tests though, we can mock out semi-meaningful values.
    // This mock is required for e.g. "onScroll" tests to work properly.
    Object.defineProperties(HTMLElement.prototype, {
      clientWidth: {
        configurable: true,
        get: function() {
          return parseInt(this.style.width, 10) || 0;
        },
      },
      clientHeight: {
        configurable: true,
        get: function() {
          return parseInt(this.style.height, 10) || 0;
        },
      },
      scrollHeight: {
        configurable: true,
        get: () => Number.MAX_SAFE_INTEGER,
      },
      scrollWidth: {
        configurable: true,
        get: () => Number.MAX_SAFE_INTEGER,
      },
    });

    itemRenderer = jest.fn(({ style, ...rest }) => (
      <div style={style}>{JSON.stringify(rest, null, 2)}</div>
    ));
    itemSize = jest.fn(index => 25 + index);
    onItemsRendered = jest.fn();
    defaultProps = {
      children: PureItemRenderer,
      estimatedItemSize: 25,
      height: 100,
      itemCount: 20,
      itemSize,
      onItemsRendered,
      width: 50,
    };
  });

  // Much of the shared List functionality is already tested by FixedSizeList tests.
  // This test covers functionality that is unique to VariableSizeList.

  it('should render an empty list', () => {
    ReactTestRenderer.create(
      <VariableSizeList {...defaultProps} itemCount={0} />
    );
    expect(itemSize).not.toHaveBeenCalled();
    expect(itemRenderer).not.toHaveBeenCalled();
    expect(onItemsRendered).not.toHaveBeenCalled();
  });

  it('changing itemSize does not impact the rendered items', () => {
    const rendered = ReactTestRenderer.create(
      <VariableSizeList {...defaultProps} />
    );
    itemRenderer.mockClear();
    rendered.update(
      <VariableSizeList
        {...defaultProps}
        itemSize={index => 50}
        onItemsRendered={onItemsRendered}
      />
    );
    expect(itemRenderer).not.toHaveBeenCalled();
  });

  describe('estimatedItemSize', () => {
    it('should estimate an initial scrollable size based on this value', () => {
      const itemSize = jest.fn(() => 25);
      const rendered = ReactTestRenderer.create(
        <VariableSizeList
          {...defaultProps}
          estimatedItemSize={50}
          height={100}
          itemCount={100}
          itemSize={itemSize}
          overscanCount={0}
        />
      );
      // We'll render 5 rows initially, each at 25px tall (125px total).
      // The remaining 95 rows will be estimated at 50px tall (4,750px total).
      // This means an initial height estimate of 4,875px.
      expect(itemSize).toHaveBeenCalledTimes(5);
      const scrollContainer = findScrollContainer(rendered);
      expect(scrollContainer.props.style.height).toEqual(4875);
    });

    it('should update the scrollable size as more items are measured', () => {
      const itemSize = jest.fn(() => 25);
      const rendered = ReactTestRenderer.create(
        <VariableSizeList
          {...defaultProps}
          estimatedItemSize={50}
          itemCount={100}
          itemSize={itemSize}
          overscanCount={0}
        />
      );
      rendered.getInstance().scrollToItem(18);
      // Including the additional 1 (minimum) overscan row,
      // We've now measured 20 rows, each at 25px tall (500px total).
      // The remaining 80 rows will be estimated at 50px tall (4,500px total).
      // This means an updated height estimate of 4,500px.
      expect(itemSize).toHaveBeenCalledTimes(20);
      const scrollContainer = findScrollContainer(rendered);
      expect(scrollContainer.props.style.height).toEqual(4500);
    });
  });

  describe('getEstimatedRemainingHeight', () => {
    const itemSizes = Array.from({ length: 100 }, (v, i) => 25 + i);

    it('should calculate an initial estimable scrollable size', () => {
      const itemSize = jest.fn(i => itemSizes[i]);
      const getEstimate = jest.fn(i => 75 * (100 - i));

      const rendered = ReactTestRenderer.create(
        <VariableSizeList
          {...defaultProps}
          getEstimatedRemainingHeight={getEstimate}
          height={100}
          itemCount={100}
          itemSize={itemSize}
          overscanCount={0}
        />
      );

      // We'll render 5 rows initially (135px total).
      // The remaining 95 rows are calculated to be at total of 7,315px.
      // This means an initial height estimate of 7,450px.
      expect(itemSize).toHaveBeenCalledTimes(5);
      expect(getEstimate).toHaveBeenCalledTimes(1);
      expect(getEstimate).toHaveBeenCalledWith(5);

      const scrollContainer = findScrollContainer(rendered);
      expect(scrollContainer.props.style.height).toEqual(7260);
    });

    it('should update the scrollable size as more items are measured', () => {
      const itemSize = jest.fn(i => itemSizes[i]);
      const getEstimate = jest.fn(i => 75 * (100 - i));

      const rendered = ReactTestRenderer.create(
        <VariableSizeList
          {...defaultProps}
          getEstimatedRemainingHeight={getEstimate}
          height={100}
          itemCount={100}
          itemSize={itemSize}
          overscanCount={0}
        />
      );
      rendered.getInstance().scrollToItem(18);
      // Including the additional 1 (minimum) overscan row,
      // We've now measured 20 rows (690px total).
      // The remaining 80 rows will be estimated at 75px tall (6000px total).
      // This means an updated height estimate of 6,690px.
      expect(itemSize).toHaveBeenCalledTimes(20);
      // Called twice for both renders, once for scrollToItem.
      expect(getEstimate).toHaveBeenCalledTimes(3);
      const scrollContainer = findScrollContainer(rendered);
      expect(scrollContainer.props.style.height).toEqual(6690);
    });
  });

  describe('scrollToItem method', () => {
    it('should not set invalid offsets when the list contains few items', () => {
      const onScroll = jest.fn();
      const rendered = ReactTestRenderer.create(
        <VariableSizeList {...defaultProps} itemCount={3} onScroll={onScroll} />
      );
      expect(onItemsRendered).toMatchSnapshot();
      onItemsRendered.mockClear();
      rendered.getInstance().scrollToItem(0);
      expect(onItemsRendered).not.toHaveBeenCalled();
    });

    it('should scroll to the correct item for align = "auto"', () => {
      const onItemsRendered = jest.fn();
      const rendered = ReactTestRenderer.create(
        <VariableSizeList {...defaultProps} onItemsRendered={onItemsRendered} />
      );
      // Scroll down enough to show item 10 at the bottom.
      rendered.getInstance().scrollToItem(10, 'auto');
      // No need to scroll again; item 9 is already visible.
      // Overscan indices will change though, since direction changes.
      rendered.getInstance().scrollToItem(9, 'auto');
      // Scroll up enough to show item 2 at the top.
      rendered.getInstance().scrollToItem(2, 'auto');
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('scroll with align = "auto" should work with partially-visible items', () => {
      const rendered = ReactTestRenderer.create(
        // Create list where items don't fit exactly into container.
        // The container has space for 3 1/3 items.
        <VariableSizeList
          {...defaultProps}
          itemCount={100}
          itemSize={() => 30}
        />
      );
      // Scroll down enough to show item 10 at the bottom.
      // Should show 4 items: 3 full and one partial at the beginning
      rendered.getInstance().scrollToItem(10, 'auto');
      // No need to scroll again; item 9 is already visible.
      // Because there's no scrolling, it won't call onItemsRendered.
      rendered.getInstance().scrollToItem(9, 'auto');
      // Scroll to near the end. #96 will be shown as partial.
      rendered.getInstance().scrollToItem(99, 'auto');
      // Scroll back to show #96 fully. This will cause #99 to be shown as a
      // partial. Because #96 was already shown previously as a partial, all
      // props of the onItemsRendered will be the same. This means that even
      // though a scroll happened in the DOM, onItemsRendered won't be called.
      rendered.getInstance().scrollToItem(96, 'auto');
      // Scroll forward again. Because item #99 was already shown partially,
      // all props of the onItemsRendered will be the same.
      rendered.getInstance().scrollToItem(99, 'auto');
      // Scroll to the second item. A partial fifth item should
      // be shown after it.
      rendered.getInstance().scrollToItem(1, 'auto');
      // Scroll to the first item. Now the fourth item should be a partial.
      rendered.getInstance().scrollToItem(0, 'auto');
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('should scroll to the correct item for align = "start"', () => {
      const onItemsRendered = jest.fn();
      const rendered = ReactTestRenderer.create(
        <VariableSizeList {...defaultProps} onItemsRendered={onItemsRendered} />
      );
      // Scroll down enough to show item 10 at the top.
      rendered.getInstance().scrollToItem(10, 'start');
      // Scroll back up so that item 9 is at the top.
      // Overscroll direction wil change too.
      rendered.getInstance().scrollToItem(9, 'start');
      // Item 19 can't align at the top because there aren't enough items.
      // Scroll down as far as possible though.
      // Overscroll direction wil change again.
      rendered.getInstance().scrollToItem(19, 'start');
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('should scroll to the correct item for align = "end"', () => {
      const onItemsRendered = jest.fn();
      const rendered = ReactTestRenderer.create(
        <VariableSizeList {...defaultProps} onItemsRendered={onItemsRendered} />
      );
      // Scroll down enough to show item 10 at the bottom.
      rendered.getInstance().scrollToItem(10, 'end');
      // Scroll back up so that item 9 is at the bottom.
      // Overscroll direction wil change too.
      rendered.getInstance().scrollToItem(9, 'end');
      // Item 1 can't align at the bottom because it's too close to the beginning.
      // Scroll up as far as possible though.
      // Overscroll direction wil change again.
      rendered.getInstance().scrollToItem(1, 'end');
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('should scroll to the correct item for align = "center"', () => {
      const onItemsRendered = jest.fn();
      const rendered = ReactTestRenderer.create(
        <VariableSizeList {...defaultProps} onItemsRendered={onItemsRendered} />
      );
      // Scroll down enough to show item 10 in the middle.
      rendered.getInstance().scrollToItem(10, 'center');
      // Scroll back up so that item 9 is in the middle.
      // Overscroll direction wil change too.
      rendered.getInstance().scrollToItem(9, 'center');
      // Item 1 can't align in the middle because it's too close to the beginning.
      // Scroll up as far as possible though.
      // Overscroll direction wil change again.
      rendered.getInstance().scrollToItem(1, 'center');
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
      // Item 19 can't align in the middle because it's too close to the end.
      // Scroll down as far as possible though.
      // Overscroll direction wil change again.
      rendered.getInstance().scrollToItem(19, 'center');
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('should scroll to the correct item for align = "smart"', () => {
      const onItemsRendered = jest.fn();
      const rendered = ReactTestRenderer.create(
        <VariableSizeList {...defaultProps} onItemsRendered={onItemsRendered} />
      );
      // Scroll down enough to show item 10 in the middle.
      rendered.getInstance().scrollToItem(10, 'smart');
      // Scrolldn't scroll at all because it's close enough.
      rendered.getInstance().scrollToItem(9, 'smart');
      // Should scroll but not center because it's close enough.
      rendered.getInstance().scrollToItem(6, 'smart');
      // Item 1 can't align in the middle because it's too close to the beginning.
      // Scroll up as far as possible though.
      rendered.getInstance().scrollToItem(1, 'smart');
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });
  });

  describe('onScroll', () => {
    it('scrolling should report partial items correctly in onItemsRendered', () => {
      // Use ReactDOM renderer so the container ref works correctly.
      const instance = render(
        <VariableSizeList
          {...defaultProps}
          initialScrollOffset={20}
          itemCount={100}
          itemSize={() => 25}
        />,
        document.createElement('div')
      );
      // Scroll 2 items fwd, but thanks to the initialScrollOffset, we should
      // still be showing partials on both ends.
      simulateScroll(instance, 70);
      // Scroll a little fwd to cause partials to be hidden
      simulateScroll(instance, 75);
      // Scroll backwards to show partials again
      simulateScroll(instance, 70);
      // Scroll near the end so that the last item is shown
      // as a partial.
      simulateScroll(instance, 96 * 25 - 5);
      // Scroll to the end. No partials.
      simulateScroll(instance, 96 * 25);
      // Verify that backwards scrolling near the end works OK.
      simulateScroll(instance, 96 * 25 - 5);
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });
  });

  describe('resetAfterIndex method', () => {
    it('should recalculate the estimated total size', () => {
      const itemSize = jest.fn(() => 75);
      const rendered = ReactTestRenderer.create(
        <VariableSizeList {...defaultProps} itemSize={index => 25} />
      );
      rendered.getInstance().scrollToItem(19);
      // We've measured every item initially.
      const scrollContainer = findScrollContainer(rendered);
      expect(scrollContainer.props.style.height).toEqual(500);
      // Supplying a new itemSize alone should not impact anything.
      rendered.update(
        <VariableSizeList {...defaultProps} itemSize={itemSize} />
      );
      expect(scrollContainer.props.style.height).toEqual(500);
      // Reset styles after index 15,
      // And verify that the new estimated total takes this into account.
      rendered.getInstance().resetAfterIndex(15);
      rendered.getInstance().scrollToItem(19);
      expect(itemSize).toHaveBeenCalledTimes(5);
      expect(scrollContainer.props.style.height).toEqual(750);
    });

    it('should delay the recalculation of the estimated total size if shouldForceUpdate is false', () => {
      const rendered = ReactTestRenderer.create(
        <VariableSizeList
          {...defaultProps}
          estimatedItemSize={30}
          overscanCount={1}
          itemSize={index => 25}
        />
      );
      const scrollContainer = findScrollContainer(rendered);
      // The estimated total size should be (100 + 25 * 1 + 30 * 15)px = 575px.
      expect(scrollContainer.props.style.height).toEqual(575);
      // Supplying a new itemSize alone should not impact anything.
      // Although the list get re-rendered by passing inline functions,
      // but it still use the cached metrics to calculate the estimated size.
      rendered.update(
        <VariableSizeList
          {...defaultProps}
          estimatedItemSize={30}
          overscanCount={1}
          itemSize={index => 20}
        />
      );
      expect(scrollContainer.props.style.height).toEqual(575);
      // Reset calculation cache but don't re-render the list,
      // the estimated total size should stay the same.
      rendered.getInstance().resetAfterIndex(0, false);
      expect(scrollContainer.props.style.height).toEqual(575);
      // Pass inline function to make the list re-render.
      rendered.update(
        <VariableSizeList
          {...defaultProps}
          estimatedItemSize={30}
          overscanCount={1}
          itemSize={index => 20}
        />
      );
      // The estimated total height should be (100 + 20 * 1 + 30 * 14)px = 540px.
      expect(scrollContainer.props.style.height).toEqual(540);
    });

    it('should re-render items after the specified index with updated styles', () => {
      const itemSize = jest.fn(() => 75);
      const rendered = ReactTestRenderer.create(
        <VariableSizeList
          {...defaultProps}
          itemCount={5}
          itemSize={index => 25}
        />
      );
      // We've rendered 5 rows initially.
      expect(itemRenderer).toHaveBeenCalledTimes(5);
      expect(itemRenderer.mock.calls[3][0].style.height).toBe(25);
      // Supplying a new itemSize alone should not impact anything.
      rendered.update(
        <VariableSizeList {...defaultProps} itemCount={5} itemSize={itemSize} />
      );
      // Reset styles for rows 4 and 5.
      // And verify that the affected rows are re-rendered with new styles.
      itemRenderer.mockClear();
      rendered.getInstance().resetAfterIndex(3);
      expect(itemRenderer).toHaveBeenCalledTimes(5);
      expect(itemRenderer.mock.calls[3][0].style.height).toBe(75);
    });
  });

  describe('props validation', () => {
    beforeEach(() => spyOn(console, 'error'));

    it('should fail if non-function itemSize is provided', () => {
      expect(() =>
        ReactTestRenderer.create(
          <VariableSizeList {...defaultProps} itemSize={123} />
        )
      ).toThrow(
        'An invalid "itemSize" prop has been specified. ' +
          'Value should be a function. "number" was specified.'
      );
    });
  });

  // https://github.com/bvaughn/react-window/pull/138
  it('should descrease scroll size when itemCount decreases', () => {
    const innerRef = createRef();
    const listRef = createRef();

    class Wrapper extends PureComponent {
      state = { itemCount: 100 };
      render() {
        return (
          <VariableSizeList
            {...defaultProps}
            itemCount={this.state.itemCount}
            innerRef={innerRef}
            ref={listRef}
          />
        );
      }
    }

    // Use ReactDOM renderer so "scroll" events work correctly.
    const instance = render(<Wrapper />, document.createElement('div'));

    // Simulate scrolling past several rows.
    simulateScroll(listRef.current, 3000);

    // Decrease itemCount a lot and verify the scroll height is descreased as well.
    instance.setState({ itemCount: 3 });
    expect(innerRef.current.style.height).toEqual('78px');
  });
});
