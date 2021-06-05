import React, { createRef, forwardRef, PureComponent } from 'react';
import ReactDOM from 'react-dom';
import ReactTestRenderer from 'react-test-renderer';
import { Simulate } from 'react-dom/test-utils';
import { FixedSizeList } from '..';

const simulateScroll = (instance, scrollOffset, direction = 'vertical') => {
  if (direction === 'horizontal') {
    instance._outerRef.scrollLeft = scrollOffset;
  } else {
    instance._outerRef.scrollTop = scrollOffset;
  }
  Simulate.scroll(instance._outerRef);
};

const findScrollContainer = rendered => rendered.root.children[0].children[0];

describe('FixedSizeList', () => {
  let itemRenderer, defaultProps, onItemsRendered;

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

    onItemsRendered = jest.fn();

    itemRenderer = jest.fn(({ style, ...rest }) => (
      <div style={style}>{JSON.stringify(rest, null, 2)}</div>
    ));
    defaultProps = {
      children: PureItemRenderer,
      height: 100,
      itemCount: 100,
      itemSize: 25,
      onItemsRendered,
      width: 50,
    };
  });

  it('should render an empty list', () => {
    ReactTestRenderer.create(<FixedSizeList {...defaultProps} itemCount={0} />);
    expect(itemRenderer).not.toHaveBeenCalled();
    expect(onItemsRendered).not.toHaveBeenCalled();
  });

  it('should render a list of rows', () => {
    ReactTestRenderer.create(<FixedSizeList {...defaultProps} />);
    expect(itemRenderer).toHaveBeenCalledTimes(6);
    expect(onItemsRendered.mock.calls).toMatchSnapshot();
  });

  it('should render a list of columns', () => {
    ReactTestRenderer.create(
      <FixedSizeList {...defaultProps} layout="horizontal" />
    );
    expect(itemRenderer).toHaveBeenCalledTimes(4);
    expect(onItemsRendered.mock.calls).toMatchSnapshot();
  });

  it('should re-render items if layout changes', () => {
    const rendered = ReactTestRenderer.create(
      <FixedSizeList {...defaultProps} layout="vertical" />
    );
    expect(itemRenderer).toHaveBeenCalled();
    itemRenderer.mockClear();

    // Re-rendering should not affect pure sCU children:
    rendered.update(<FixedSizeList {...defaultProps} layout="vertical" />);
    expect(itemRenderer).not.toHaveBeenCalled();

    // Re-rendering with new layout should re-render children:
    rendered.update(<FixedSizeList {...defaultProps} layout="horizontal" />);
    expect(itemRenderer).toHaveBeenCalled();
  });

  // TODO Deprecate direction "horizontal"
  it('should re-render items if direction changes', () => {
    spyOn(console, 'warn'); // Ingore legacy prop warning

    const rendered = ReactTestRenderer.create(
      <FixedSizeList {...defaultProps} direction="vertical" />
    );
    expect(itemRenderer).toHaveBeenCalled();
    itemRenderer.mockClear();

    // Re-rendering should not affect pure sCU children:
    rendered.update(<FixedSizeList {...defaultProps} direction="vertical" />);
    expect(itemRenderer).not.toHaveBeenCalled();

    // Re-rendering with new layout should re-render children:
    rendered.update(<FixedSizeList {...defaultProps} direction="horizontal" />);
    expect(itemRenderer).toHaveBeenCalled();
  });

  describe('scrollbar handling', () => {
    it('should set width to "100%" for vertical lists to avoid unnecessary horizontal scrollbar', () => {
      const innerRef = createRef();
      ReactDOM.render(
        <FixedSizeList {...defaultProps} innerRef={innerRef} />,
        document.createElement('div')
      );
      const style = innerRef.current.style;
      expect(style.width).toBe('100%');
      expect(style.height).toBe('2500px');
    });

    it('should set height to "100%" for horizontal lists to avoid unnecessary vertical scrollbar', () => {
      const innerRef = createRef();
      ReactDOM.render(
        <FixedSizeList
          {...defaultProps}
          layout="horizontal"
          innerRef={innerRef}
        />,
        document.createElement('div')
      );
      const style = innerRef.current.style;
      expect(style.width).toBe('2500px');
      expect(style.height).toBe('100%');
    });
  });

  describe('style caching', () => {
    it('should cache styles while scrolling to avoid breaking pure sCU for items', () => {
      const rendered = ReactTestRenderer.create(
        <FixedSizeList {...defaultProps} />
      );
      // Scroll a few times.
      // Each time, make sure to render item 3.
      rendered.getInstance().scrollToItem(1, 'start');
      rendered.getInstance().scrollToItem(2, 'start');
      rendered.getInstance().scrollToItem(3, 'start');
      // Find all of the times item 3 was rendered.
      // If we are caching props correctly, it should only be once.
      expect(
        itemRenderer.mock.calls.filter(([params]) => params.index === 3)
      ).toHaveLength(1);
    });

    it('should reset cached styles when scrolling stops', () => {
      // Use ReactDOM renderer so the container ref and "onScroll" work correctly.
      const instance = ReactDOM.render(
        <FixedSizeList {...defaultProps} useIsScrolling />,
        document.createElement('div')
      );
      // Scroll, then capture the rendered style for item 1,
      // Then let the debounce timer clear the cached styles.
      simulateScroll(instance, 251);
      const itemOneArgsA = itemRenderer.mock.calls.find(
        ([params]) => params.index === 1
      );
      jest.runAllTimers();
      itemRenderer.mockClear();
      // Scroll again, then capture the rendered style for item 1,
      // And confirm that the style was recreated.
      simulateScroll(instance, 0);
      const itemOneArgsB = itemRenderer.mock.calls.find(
        ([params]) => params.index === 1
      );
      expect(itemOneArgsA[0].style).not.toBe(itemOneArgsB[0].style);
    });
  });

  it('changing itemSize updates the rendered items', () => {
    const rendered = ReactTestRenderer.create(
      <FixedSizeList {...defaultProps} />
    );
    rendered.update(<FixedSizeList {...defaultProps} itemSize={50} />);
    expect(onItemsRendered.mock.calls).toMatchSnapshot();
  });

  it('changing itemSize updates the rendered items and busts the style cache', () => {
    const rendered = ReactTestRenderer.create(
      <FixedSizeList {...defaultProps} />
    );
    const oldStyle = itemRenderer.mock.calls[0][0].style;
    itemRenderer.mockClear();
    rendered.update(<FixedSizeList {...defaultProps} itemSize={50} />);
    expect(itemRenderer).toHaveBeenCalled();
    const newStyle = itemRenderer.mock.calls[0][0].style;
    expect(oldStyle).not.toBe(newStyle);
  });

  it('should support momentum scrolling on iOS devices', () => {
    const rendered = ReactTestRenderer.create(
      <FixedSizeList {...defaultProps} />
    );
    expect(rendered.toJSON().props.style.WebkitOverflowScrolling).toBe('touch');
  });

  it('should disable pointer events while scrolling', () => {
    const rendered = ReactTestRenderer.create(
      <FixedSizeList {...defaultProps} />
    );
    const scrollContainer = findScrollContainer(rendered);
    expect(scrollContainer.props.style.pointerEvents).toBe(undefined);
    rendered.getInstance().setState({ isScrolling: true });
    expect(scrollContainer.props.style.pointerEvents).toBe('none');
  });

  describe('style overrides', () => {
    it('should support className prop', () => {
      const rendered = ReactTestRenderer.create(
        <FixedSizeList {...defaultProps} className="custom" />
      );
      expect(rendered.toJSON().props.className).toBe('custom');
    });

    it('should support style prop', () => {
      const rendered = ReactTestRenderer.create(
        <FixedSizeList {...defaultProps} style={{ backgroundColor: 'red' }} />
      );
      expect(rendered.toJSON().props.style.backgroundColor).toBe('red');
    });
  });

  describe('direction', () => {
    it('should set the appropriate CSS direction style', () => {
      const renderer = ReactTestRenderer.create(
        <FixedSizeList {...defaultProps} direction="ltr" />
      );
      expect(renderer.toJSON().props.style.direction).toBe('ltr');
      renderer.update(<FixedSizeList {...defaultProps} direction="rtl" />);
      expect(renderer.toJSON().props.style.direction).toBe('rtl');
    });

    it('should position items correctly', () => {
      const renderer = ReactTestRenderer.create(
        <FixedSizeList {...defaultProps} direction="ltr" />
      );

      let params = itemRenderer.mock.calls[0][0];
      expect(params.index).toBe(0);
      let style = params.style;
      expect(style.left).toBe(0);
      expect(style.right).toBeUndefined();

      itemRenderer.mockClear();

      renderer.update(<FixedSizeList {...defaultProps} direction="rtl" />);

      params = itemRenderer.mock.calls[0][0];
      expect(params.index).toBe(0);
      style = params.style;
      expect(style.left).toBeUndefined();
      expect(style.right).toBe(0);
    });
  });

  describe('overscanCount', () => {
    it('should require a minimum of 1 overscan to support tabbing', () => {
      ReactTestRenderer.create(
        <FixedSizeList
          {...defaultProps}
          initialScrollOffset={50}
          overscanCount={0}
        />
      );
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('should overscan in the direction being scrolled', () => {
      const instance = ReactDOM.render(
        <FixedSizeList
          {...defaultProps}
          initialScrollOffset={50}
          overscanCount={2}
        />,
        document.createElement('div')
      );
      // Simulate scrolling (rather than using scrollTo) to test isScrolling state.
      simulateScroll(instance, 100);
      simulateScroll(instance, 50);
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('should overscan in both directions when not scrolling', () => {
      ReactTestRenderer.create(
        <FixedSizeList {...defaultProps} initialScrollOffset={50} />
      );
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('should accommodate a custom overscan', () => {
      ReactTestRenderer.create(
        <FixedSizeList
          {...defaultProps}
          initialScrollOffset={100}
          overscanCount={3}
        />
      );
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('should not scan past the beginning of the list', () => {
      ReactTestRenderer.create(
        <FixedSizeList {...defaultProps} initialScrollOffset={0} />
      );
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('should not scan past the end of the list', () => {
      ReactTestRenderer.create(
        <FixedSizeList
          {...defaultProps}
          itemCount={10}
          initialScrollOffset={150}
        />
      );
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });
  });

  describe('useIsScrolling', () => {
    it('should not pass an isScrolling param to children unless requested', () => {
      ReactTestRenderer.create(<FixedSizeList {...defaultProps} />);
      expect(itemRenderer.mock.calls[0][0].isScrolling).toBe(undefined);
    });

    it('should pass an isScrolling param to children if requested', () => {
      // Use ReactDOM renderer so the container ref and "onScroll" work correctly.
      const instance = ReactDOM.render(
        <FixedSizeList {...defaultProps} useIsScrolling />,
        document.createElement('div')
      );
      expect(itemRenderer.mock.calls[0][0].isScrolling).toBe(false);
      itemRenderer.mockClear();
      simulateScroll(instance, 100);
      expect(itemRenderer.mock.calls[0][0].isScrolling).toBe(true);
      itemRenderer.mockClear();
      jest.runAllTimers();
      expect(itemRenderer.mock.calls[0][0].isScrolling).toBe(false);
    });

    it('should not re-render children unnecessarily if isScrolling param is not used', () => {
      // Use ReactDOM renderer so the container ref and "onScroll" work correctly.
      const instance = ReactDOM.render(
        <FixedSizeList {...defaultProps} overscanCount={1} />,
        document.createElement('div')
      );
      simulateScroll(instance, 100);
      itemRenderer.mockClear();
      jest.runAllTimers();
      expect(itemRenderer).not.toHaveBeenCalled();
    });
  });

  describe('scrollTo method', () => {
    it('should not report isScrolling', () => {
      // Use ReactDOM renderer so the container ref and "onScroll" work correctly.
      const instance = ReactDOM.render(
        <FixedSizeList {...defaultProps} useIsScrolling />,
        document.createElement('div')
      );
      itemRenderer.mockClear();
      instance.scrollTo(100);
      expect(itemRenderer.mock.calls[0][0].isScrolling).toBe(false);
    });

    it('should ignore values less than zero', () => {
      const onScroll = jest.fn();
      const instance = ReactDOM.render(
        <FixedSizeList {...defaultProps} onScroll={onScroll} />,
        document.createElement('div')
      );
      instance.scrollTo(100);
      onScroll.mockClear();
      instance.scrollTo(-1);
      expect(onScroll.mock.calls[0][0].scrollOffset).toBe(0);
    });
  });

  describe('scrollToItem method', () => {
    it('should not set invalid offsets when the list contains few items', () => {
      const onScroll = jest.fn();
      const rendered = ReactTestRenderer.create(
        <FixedSizeList {...defaultProps} itemCount={3} onScroll={onScroll} />
      );
      expect(onItemsRendered).toMatchSnapshot();
      onItemsRendered.mockClear();
      rendered.getInstance().scrollToItem(0);
      expect(onItemsRendered).not.toHaveBeenCalled();
    });

    it('should scroll to the correct item for align = "auto"', () => {
      const rendered = ReactTestRenderer.create(
        <FixedSizeList {...defaultProps} />
      );
      // Scroll down enough to show item 10 at the bottom.
      rendered.getInstance().scrollToItem(10, 'auto');
      // No need to scroll again; item 9 is already visible.
      // Because there's no scrolling, it won't call onItemsRendered.
      rendered.getInstance().scrollToItem(9, 'auto');
      // Scroll up enough to show item 2 at the top.
      rendered.getInstance().scrollToItem(2, 'auto');
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('scroll with align = "auto" should work with partially-visible items', () => {
      const rendered = ReactTestRenderer.create(
        // Create list where items don't fit exactly into container.
        // The container has space for 3 1/3 items.
        <FixedSizeList {...defaultProps} itemSize={30} />
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

    it('scroll with align = "auto" should work with very small lists and partial items', () => {
      const rendered = ReactTestRenderer.create(
        // Create list with only two items, one of which will be shown as a partial.
        <FixedSizeList {...defaultProps} itemSize={60} itemCount={2} />
      );
      // Show the second item fully. The first item should be a partial.
      rendered.getInstance().scrollToItem(1, 'auto');
      // Go back to the first item. The second should be a partial again.
      rendered.getInstance().scrollToItem(0, 'auto');
      // None of the scrollToItem calls above should actually cause a scroll,
      // so there will only be one snapshot.
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('should scroll to the correct item for align = "start"', () => {
      const rendered = ReactTestRenderer.create(
        <FixedSizeList {...defaultProps} />
      );
      // Scroll down enough to show item 10 at the top.
      rendered.getInstance().scrollToItem(10, 'start');
      // Scroll back up so that item 9 is at the top.
      // Overscroll direction wil change too.
      rendered.getInstance().scrollToItem(9, 'start');
      // Item 99 can't align at the top because there aren't enough items.
      // Scroll down as far as possible though.
      // Overscroll direction wil change again.
      rendered.getInstance().scrollToItem(99, 'start');
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('should scroll to the correct item for align = "end"', () => {
      const rendered = ReactTestRenderer.create(
        <FixedSizeList {...defaultProps} />
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
      const rendered = ReactTestRenderer.create(
        <FixedSizeList {...defaultProps} />
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
      // Item 99 can't align in the middle because it's too close to the end.
      // Scroll down as far as possible though.
      // Overscroll direction wil change again.
      rendered.getInstance().scrollToItem(99, 'center');
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('should scroll to the correct item for align = "smart"', () => {
      const rendered = ReactTestRenderer.create(
        <FixedSizeList {...defaultProps} />
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
      // Item 99 can't align in the middle because it's too close to the end.
      // Scroll down as far as possible though.
      rendered.getInstance().scrollToItem(99, 'smart');
      // This shouldn't scroll at all because it's close enough.
      rendered.getInstance().scrollToItem(95, 'smart');
      rendered.getInstance().scrollToItem(99, 'smart');
      // This should scroll with the 'auto' behavior because it's within a screen.
      rendered.getInstance().scrollToItem(94, 'smart');
      rendered.getInstance().scrollToItem(99, 'smart');
      // This should scroll with the 'center' behavior because it's too far.
      rendered.getInstance().scrollToItem(90, 'smart');
      rendered.getInstance().scrollToItem(99, 'smart');
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('should not report isScrolling', () => {
      // Use ReactDOM renderer so the container ref and "onScroll" work correctly.
      const instance = ReactDOM.render(
        <FixedSizeList {...defaultProps} useIsScrolling />,
        document.createElement('div')
      );
      itemRenderer.mockClear();
      instance.scrollToItem(15);
      expect(itemRenderer.mock.calls[0][0].isScrolling).toBe(false);
    });

    it('should ignore indexes less than zero', () => {
      const instance = ReactDOM.render(
        <FixedSizeList {...defaultProps} />,
        document.createElement('div')
      );
      instance.scrollToItem(20);
      onItemsRendered.mockClear();
      instance.scrollToItem(-1);
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('should ignore indexes greater than itemCount', () => {
      const instance = ReactDOM.render(
        <FixedSizeList {...defaultProps} />,
        document.createElement('div')
      );
      onItemsRendered.mockClear();
      instance.scrollToItem(defaultProps.itemCount * 2);
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });
  });

  // onItemsRendered is pretty well covered by other snapshot tests
  describe('onScroll', () => {
    it('should call onScroll after mount', () => {
      const onScroll = jest.fn();
      ReactTestRenderer.create(
        <FixedSizeList {...defaultProps} onScroll={onScroll} />
      );
      expect(onScroll.mock.calls).toMatchSnapshot();
    });

    it('should call onScroll when scroll position changes', () => {
      const onScroll = jest.fn();
      const rendered = ReactTestRenderer.create(
        <FixedSizeList {...defaultProps} onScroll={onScroll} />
      );
      rendered.getInstance().scrollTo(100);
      rendered.getInstance().scrollTo(0);
      expect(onScroll.mock.calls).toMatchSnapshot();
    });

    it('should distinguish between "onScroll" events and scrollTo() calls', () => {
      const onScroll = jest.fn();
      // Use ReactDOM renderer so the container ref and "onScroll" event work correctly.
      const instance = ReactDOM.render(
        <FixedSizeList {...defaultProps} onScroll={onScroll} />,
        document.createElement('div')
      );

      onScroll.mockClear();
      instance.scrollTo(100);
      expect(onScroll.mock.calls[0][0].scrollUpdateWasRequested).toBe(true);

      onScroll.mockClear();
      simulateScroll(instance, 200);
      expect(onScroll.mock.calls[0][0].scrollUpdateWasRequested).toBe(false);
    });

    it('scrolling should report partial items correctly in onItemsRendered', () => {
      // Use ReactDOM renderer so the container ref works correctly.
      const instance = ReactDOM.render(
        <FixedSizeList {...defaultProps} initialScrollOffset={20} />,
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

  describe('itemKey', () => {
    it('should be used', () => {
      const itemKey = jest.fn(index => index);
      ReactTestRenderer.create(
        <FixedSizeList {...defaultProps} itemCount={3} itemKey={itemKey} />
      );
      expect(itemKey).toHaveBeenCalledTimes(3);
      expect(itemKey.mock.calls[0][0]).toBe(0);
      expect(itemKey.mock.calls[1][0]).toBe(1);
      expect(itemKey.mock.calls[2][0]).toBe(2);
    });

    it('should allow items to be moved within the collection without causing caching problems', () => {
      const keyMap = ['0', '1', '2'];
      const keyMapItemRenderer = jest.fn(({ index, style }) => (
        <div style={style}>{keyMap[index]}</div>
      ));
      class ItemRenderer extends PureComponent {
        render() {
          return keyMapItemRenderer(this.props);
        }
      }
      const itemKey = jest.fn(index => keyMap[index]);
      const rendered = ReactTestRenderer.create(
        <FixedSizeList {...defaultProps} itemCount={3} itemKey={itemKey}>
          {ItemRenderer}
        </FixedSizeList>
      );
      expect(itemKey).toHaveBeenCalledTimes(3);
      itemKey.mockClear();

      expect(keyMapItemRenderer).toHaveBeenCalledTimes(3);
      keyMapItemRenderer.mockClear();

      // Simulate swapping the first and last items.
      keyMap[0] = '2';
      keyMap[2] = '0';

      rendered.getInstance().forceUpdate();

      // Our key getter should be called again for each key.
      // Since we've modified the map, the first and last key will swap.
      expect(itemKey).toHaveBeenCalledTimes(3);

      // The first and third item have swapped place,
      // So they should have been re-rendered,
      // But the second item should not.
      expect(keyMapItemRenderer).toHaveBeenCalledTimes(2);
      expect(keyMapItemRenderer.mock.calls[0][0].index).toBe(0);
      expect(keyMapItemRenderer.mock.calls[1][0].index).toBe(2);
    });

    it('should receive a data value if itemData is provided', () => {
      const itemKey = jest.fn(index => index);
      const itemData = {};
      ReactTestRenderer.create(
        <FixedSizeList
          {...defaultProps}
          itemData={itemData}
          itemKey={itemKey}
        />
      );
      expect(itemKey).toHaveBeenCalled();
      expect(
        itemKey.mock.calls.filter(([index, data]) => data === itemData)
      ).toHaveLength(itemKey.mock.calls.length);
    });

    it('should receive the item index relative to the current rendered items as virtualizedIndex', () => {
      const itemKey = jest.fn(index => index);

      const rendered = ReactTestRenderer.create(
        // Create list where items don't fit exactly into container.
        // The container has space for 3 1/3 items.
        <FixedSizeList {...defaultProps} itemSize={20} itemKey={itemKey} />
      );

      expect(itemKey).toHaveBeenCalledTimes(7);
      expect(itemKey.mock.calls).toMatchSnapshot();
      itemKey.mockClear();

      rendered.getInstance().scrollToItem(10, 'auto');

      expect(itemKey).toHaveBeenCalledTimes(9);
      expect(itemKey.mock.calls).toMatchSnapshot();
    });
  });

  describe('refs', () => {
    it('should pass through innerRef and outerRef ref functions', () => {
      const innerRef = jest.fn();
      const outerRef = jest.fn();
      ReactDOM.render(
        <FixedSizeList
          {...defaultProps}
          innerRef={innerRef}
          outerRef={outerRef}
        />,
        document.createElement('div')
      );
      expect(innerRef).toHaveBeenCalled();
      expect(innerRef.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
      expect(outerRef).toHaveBeenCalled();
      expect(outerRef.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
    });

    it('should pass through innerRef and outerRef createRef objects', () => {
      const innerRef = createRef();
      const outerRef = createRef();
      ReactDOM.render(
        <FixedSizeList
          {...defaultProps}
          innerRef={innerRef}
          outerRef={outerRef}
        />,
        document.createElement('div')
      );
      expect(innerRef.current).toBeInstanceOf(HTMLDivElement);
      expect(outerRef.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('custom element types', () => {
    it('should use a custom innerElementType if specified', () => {
      const rendered = ReactTestRenderer.create(
        <FixedSizeList {...defaultProps} innerElementType="section" />
      );
      expect(rendered.root.findByType('section')).toBeDefined();
    });

    it('should use a custom outerElementType if specified', () => {
      const rendered = ReactTestRenderer.create(
        <FixedSizeList {...defaultProps} outerElementType="section" />
      );
      expect(rendered.root.findByType('section')).toBeDefined();
    });

    it('should support spreading additional, arbitrary props, e.g. id', () => {
      const container = document.createElement('div');
      ReactDOM.render(
        <FixedSizeList
          {...defaultProps}
          innerElementType={forwardRef((props, ref) => (
            <div ref={ref} id="inner" {...props} />
          ))}
          outerElementType={forwardRef((props, ref) => (
            <div ref={ref} id="outer" {...props} />
          ))}
        />,
        container
      );
      expect(container.firstChild.id).toBe('outer');
      expect(container.firstChild.firstChild.id).toBe('inner');
    });

    it('should warn if legacy innerTagName or outerTagName props are used', () => {
      spyOn(console, 'warn');

      const renderer = ReactTestRenderer.create(
        <FixedSizeList
          {...defaultProps}
          innerTagName="div"
          outerTagName="div"
        />
      );
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenLastCalledWith(
        'The innerTagName and outerTagName props have been deprecated. ' +
          'Please use the innerElementType and outerElementType props instead.'
      );

      renderer.update(
        <FixedSizeList
          {...defaultProps}
          innerTagName="div"
          outerTagName="div"
        />
      );

      // But it should only warn once.
      expect(console.warn).toHaveBeenCalledTimes(1);
    });

    it('should warn if legacy direction "horizontal" value is used', () => {
      spyOn(console, 'warn');

      const renderer = ReactTestRenderer.create(
        <FixedSizeList {...defaultProps} direction="horizontal" />
      );
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenLastCalledWith(
        'The direction prop should be either "ltr" (default) or "rtl". ' +
          'Please use the layout prop to specify "vertical" (default) or "horizontal" orientation.'
      );

      renderer.update(
        <FixedSizeList {...defaultProps} direction="horizontal" />
      );

      // But it should only warn once.
      expect(console.warn).toHaveBeenCalledTimes(1);
    });

    it('should warn if legacy direction "vertical" value is used', () => {
      spyOn(console, 'warn');

      const renderer = ReactTestRenderer.create(
        <FixedSizeList {...defaultProps} direction="vertical" />
      );
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenLastCalledWith(
        'The direction prop should be either "ltr" (default) or "rtl". ' +
          'Please use the layout prop to specify "vertical" (default) or "horizontal" orientation.'
      );

      renderer.update(<FixedSizeList {...defaultProps} direction="vertical" />);

      // But it should only warn once.
      expect(console.warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('itemData', () => {
    it('should pass itemData to item renderers as a "data" prop', () => {
      const itemData = {};
      ReactTestRenderer.create(
        <FixedSizeList {...defaultProps} itemData={itemData} />
      );
      expect(itemRenderer).toHaveBeenCalled();
      expect(
        itemRenderer.mock.calls.filter(([params]) => params.data === itemData)
      ).toHaveLength(itemRenderer.mock.calls.length);
    });

    it('should re-render items if itemData changes', () => {
      const itemData = {};
      const rendered = ReactTestRenderer.create(
        <FixedSizeList {...defaultProps} itemData={itemData} />
      );
      expect(itemRenderer).toHaveBeenCalled();
      itemRenderer.mockClear();

      // Re-rendering should not affect pure sCU children:
      rendered.update(<FixedSizeList {...defaultProps} itemData={itemData} />);
      expect(itemRenderer).not.toHaveBeenCalled();

      // Re-rendering with new itemData should re-render children:
      const newItemData = {};
      rendered.update(
        <FixedSizeList {...defaultProps} itemData={newItemData} />
      );
      expect(itemRenderer).toHaveBeenCalled();
      expect(
        itemRenderer.mock.calls.filter(
          ([params]) => params.data === newItemData
        )
      ).toHaveLength(itemRenderer.mock.calls.length);
    });
  });

  describe('props validation', () => {
    beforeEach(() => spyOn(console, 'error'));

    it('should fail if non-numeric itemSize is provided', () => {
      expect(() =>
        ReactTestRenderer.create(
          <FixedSizeList {...defaultProps} itemSize="abc" />
        )
      ).toThrow(
        'An invalid "itemSize" prop has been specified. ' +
          'Value should be a number. ' +
          '"string" was specified.'
      );
    });

    it('should fail if no children value is provided', () => {
      expect(() =>
        ReactTestRenderer.create(
          <FixedSizeList {...defaultProps} children={undefined} />
        )
      ).toThrow(
        'An invalid "children" prop has been specified. ' +
          'Value should be a React component. ' +
          '"undefined" was specified.'
      );
    });

    it('should fail if an invalid layout is provided', () => {
      expect(() =>
        ReactTestRenderer.create(
          <FixedSizeList {...defaultProps} layout={null} />
        )
      ).toThrow(
        'An invalid "layout" prop has been specified. ' +
          'Value should be either "horizontal" or "vertical". ' +
          '"null" was specified.'
      );
    });

    it('should fail if an invalid direction is provided', () => {
      expect(() =>
        ReactTestRenderer.create(
          <FixedSizeList {...defaultProps} direction={null} />
        )
      ).toThrow(
        'An invalid "direction" prop has been specified. ' +
          'Value should be either "ltr" or "rtl". ' +
          '"null" was specified.'
      );
    });

    it('should fail if a string height is provided for a vertical list', () => {
      expect(() =>
        ReactTestRenderer.create(
          <FixedSizeList {...defaultProps} layout="vertical" height="100%" />
        )
      ).toThrow(
        'An invalid "height" prop has been specified. ' +
          'Vertical lists must specify a number for height. ' +
          '"string" was specified.'
      );
    });

    it('should fail if a string width is provided for a horizontal list', () => {
      expect(() =>
        ReactTestRenderer.create(
          <FixedSizeList {...defaultProps} layout="horizontal" width="100%" />
        )
      ).toThrow(
        'An invalid "width" prop has been specified. ' +
          'Horizontal lists must specify a number for width. ' +
          '"string" was specified.'
      );
    });
  });
});
