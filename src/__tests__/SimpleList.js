import React, { createRef, forwardRef, PureComponent } from 'react';
import ReactDOM from 'react-dom';
import ReactTestRenderer from 'react-test-renderer';
import { Simulate } from 'react-dom/test-utils';
import { SimpleList } from '..';

const simulateScroll = (instance, scrollOffset) => {
  instance._outerRef.scrollTop = scrollOffset;
  Simulate.scroll(instance._outerRef);
};

describe('SimpleList', () => {
  let itemRenderer, defaultProps, onItemsDisplayed;

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

    onItemsDisplayed = jest.fn();

    itemRenderer = jest.fn(({ index, key, style }) => (
      <div key={key} style={style}>
        {index}
      </div>
    ));
    defaultProps = {
      height: 100,
      itemCount: 100,
      itemRenderer,
      itemSize: 25,
      onItemsDisplayed,
      width: 50,
    };
  });

  it('should render an empty list', () => {
    ReactTestRenderer.create(<SimpleList {...defaultProps} itemCount={0} />);
    expect(itemRenderer).not.toHaveBeenCalled();
    expect(onItemsDisplayed).not.toHaveBeenCalled();
  });

  it('should render a list of rows', () => {
    ReactTestRenderer.create(<SimpleList {...defaultProps} />);
    expect(itemRenderer).toHaveBeenCalled();
    expect(onItemsDisplayed.mock.calls).toMatchSnapshot();
  });

  it('should re-render items if layout changes', () => {
    const rendered = ReactTestRenderer.create(
      <SimpleList {...defaultProps} layout="vertical" />
    );
    expect(itemRenderer).toHaveBeenCalled();
    itemRenderer.mockClear();

    // Re-rendering should not affect pure sCU children:
    rendered.update(<SimpleList {...defaultProps} layout="vertical" />);
    expect(itemRenderer).not.toHaveBeenCalled();

    // Re-rendering with new layout should re-render children:
    rendered.update(<SimpleList {...defaultProps} layout="horizontal" />);
    expect(itemRenderer).toHaveBeenCalled();
  });

  // TODO Add tests for pre-rendering and scrolling

  it('should re-render items if direction changes', () => {
    spyOn(console, 'warn'); // Ingore legacy prop warning

    const rendered = ReactTestRenderer.create(
      <SimpleList {...defaultProps} direction="vertical" />
    );
    expect(itemRenderer).toHaveBeenCalled();
    itemRenderer.mockClear();

    // Re-rendering should not affect pure sCU children:
    rendered.update(<SimpleList {...defaultProps} direction="vertical" />);
    expect(itemRenderer).not.toHaveBeenCalled();

    // Re-rendering with new layout should re-render children:
    rendered.update(<SimpleList {...defaultProps} direction="horizontal" />);
    expect(itemRenderer).toHaveBeenCalled();
  });

  describe('initialScrollOffset', () => {
    it('should render offset 0 if no initialScrollOffset prop is specified', () => {
      const ref = React.createRef();
      ReactDOM.render(
        <SimpleList {...defaultProps} outerRef={ref} />,
        document.createElement('div')
      );
      expect(ref.current.scrollTop).toBe(0);
    });

    it('should render and update the scroll offset based on initialScrollOffset', () => {
      const ref = React.createRef();
      ReactDOM.render(
        <SimpleList
          {...defaultProps}
          initialScrollOffset={50}
          outerRef={ref}
        />,
        document.createElement('div')
      );
      expect(ref.current.scrollTop).toBe(50);
    });
  });

  describe('scrollbar handling', () => {
    it('should set width to "100%" to avoid unnecessary horizontal scrollbar', () => {
      const innerRef = createRef();
      ReactDOM.render(
        <SimpleList {...defaultProps} innerRef={innerRef} />,
        document.createElement('div')
      );
      const style = innerRef.current.style;
      expect(style.width).toBe('100%');
      expect(style.height).toBe('2500px');
    });
  });

  describe('style caching', () => {
    it('should cache styles while scrolling to avoid breaking pure sCU for items', () => {
      itemRenderer = jest.fn(({ index, style }) => (
        <div style={style}>{index}</div>
      ));

      const rendered = ReactTestRenderer.create(
        <SimpleList
          {...defaultProps}
          itemRenderer={({ key, ...props }) => (
            <PureItemRenderer key={key} {...props} />
          )}
        />
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
        <SimpleList {...defaultProps} useIsScrolling />,
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
    const rendered = ReactTestRenderer.create(<SimpleList {...defaultProps} />);
    rendered.update(<SimpleList {...defaultProps} itemSize={50} />);
    expect(onItemsDisplayed.mock.calls).toMatchSnapshot();
  });

  it('changing itemSize updates the rendered items and busts the style cache', () => {
    const rendered = ReactTestRenderer.create(<SimpleList {...defaultProps} />);
    const oldStyle = itemRenderer.mock.calls[0][0].style;
    itemRenderer.mockClear();
    rendered.update(<SimpleList {...defaultProps} itemSize={50} />);
    expect(itemRenderer).toHaveBeenCalled();
    const newStyle = itemRenderer.mock.calls[0][0].style;
    expect(oldStyle).not.toBe(newStyle);
  });

  it('should support momentum scrolling on iOS devices', () => {
    const rendered = ReactTestRenderer.create(<SimpleList {...defaultProps} />);
    expect(rendered.toJSON().props.style.WebkitOverflowScrolling).toBe('touch');
  });

  it('should disable pointer events while scrolling', () => {
    const innerRef = React.createRef();
    ReactDOM.render(
      <SimpleList {...defaultProps} innerRef={innerRef} />,
      document.createElement('div')
    );
    expect(innerRef.current.style.pointerEvents).toBe('none');

    itemRenderer.mockClear();
    jest.runAllTimers();

    // This should not require re-rendering.
    expect(innerRef.current.style.pointerEvents).toBe('auto');
    expect(itemRenderer).not.toHaveBeenCalled();
  });

  describe('style overrides', () => {
    it('should support className prop', () => {
      const rendered = ReactTestRenderer.create(
        <SimpleList {...defaultProps} className="custom" />
      );
      expect(rendered.toJSON().props.className).toBe('custom');
    });

    it('should support style prop', () => {
      const rendered = ReactTestRenderer.create(
        <SimpleList {...defaultProps} style={{ backgroundColor: 'red' }} />
      );
      expect(rendered.toJSON().props.style.backgroundColor).toBe('red');
    });
  });

  describe('overscanCount', () => {
    it('should over-render one item in both directions for keyboard accessibility / tabbing', () => {
      ReactTestRenderer.create(
        <SimpleList
          {...defaultProps}
          height={100}
          itemSize={20}
          initialScrollOffset={40}
        />
      );
      expect(onItemsDisplayed.mock.calls).toMatchSnapshot();
    });

    it('should not scan past the beginning of the list', () => {
      ReactTestRenderer.create(
        <SimpleList
          {...defaultProps}
          height={100}
          itemSize={25}
          initialScrollOffset={0}
        />
      );
      expect(onItemsDisplayed.mock.calls).toMatchSnapshot();
    });

    it('should not scan past the end of the list', () => {
      ReactTestRenderer.create(
        <SimpleList
          {...defaultProps}
          height={100}
          itemCount={10}
          itemSize={25}
          initialScrollOffset={150}
        />
      );
      expect(onItemsDisplayed.mock.calls).toMatchSnapshot();
    });
  });

  describe('scrollTo method', () => {
    it('should ignore values less than zero', () => {
      const outerRef = React.createRef();
      const instance = ReactDOM.render(
        <SimpleList {...defaultProps} outerRef={outerRef} />,
        document.createElement('div')
      );
      instance.scrollTo(100);
      expect(outerRef.current.scrollTop).toBe(100);
      instance.scrollTo(-1);
      expect(outerRef.current.scrollTop).toBe(0);
    });
  });

  describe('scrollToItem method', () => {
    it('should not set invalid offsets when the list contains few items', () => {
      const onScroll = jest.fn();
      const rendered = ReactTestRenderer.create(
        <SimpleList {...defaultProps} itemCount={3} onScroll={onScroll} />
      );
      expect(onItemsDisplayed).toMatchSnapshot();
      onItemsDisplayed.mockClear();
      rendered.getInstance().scrollToItem(0);
      expect(onItemsDisplayed).not.toHaveBeenCalled();
    });

    it('should scroll to the correct item for align = "auto"', () => {
      const rendered = ReactTestRenderer.create(
        <SimpleList {...defaultProps} />
      );
      // Scroll down enough to show item 10 at the bottom.
      rendered.getInstance().scrollToItem(10, 'auto');
      // No need to scroll again; item 9 is already visible.
      // Because there's no scrolling, it won't call onItemsDisplayed.
      rendered.getInstance().scrollToItem(9, 'auto');
      // Scroll up enough to show item 2 at the top.
      rendered.getInstance().scrollToItem(2, 'auto');
      expect(onItemsDisplayed.mock.calls).toMatchSnapshot();
    });

    it('scroll with align = "auto" should work with partially-visible items', () => {
      const rendered = ReactTestRenderer.create(
        // Create list where items don't fit exactly into container.
        // The container has space for 3 1/3 items.
        <SimpleList {...defaultProps} itemSize={30} />
      );
      // Scroll down enough to show item 10 at the bottom.
      // Should show 4 items: 3 full and one partial at the beginning
      rendered.getInstance().scrollToItem(10, 'auto');
      // No need to scroll again; item 9 is already visible.
      // Because there's no scrolling, it won't call onItemsDisplayed.
      rendered.getInstance().scrollToItem(9, 'auto');
      // Scroll to near the end. #96 will be shown as partial.
      rendered.getInstance().scrollToItem(99, 'auto');
      // Scroll back to show #96 fully. This will cause #99 to be shown as a
      // partial. Because #96 was already shown previously as a partial, all
      // props of the onItemsDisplayed will be the same. This means that even
      // though a scroll happened in the DOM, onItemsDisplayed won't be called.
      rendered.getInstance().scrollToItem(96, 'auto');
      // Scroll forward again. Because item #99 was already shown partially,
      // all props of the onItemsDisplayed will be the same.
      rendered.getInstance().scrollToItem(99, 'auto');
      // Scroll to the second item. A partial fifth item should
      // be shown after it.
      rendered.getInstance().scrollToItem(1, 'auto');
      // Scroll to the first item. Now the fourth item should be a partial.
      rendered.getInstance().scrollToItem(0, 'auto');
      expect(onItemsDisplayed.mock.calls).toMatchSnapshot();
    });

    it('scroll with align = "auto" should work with very small lists and partial items', () => {
      const rendered = ReactTestRenderer.create(
        // Create list with only two items, one of which will be shown as a partial.
        <SimpleList {...defaultProps} itemSize={60} itemCount={2} />
      );
      // Show the second item fully. The first item should be a partial.
      rendered.getInstance().scrollToItem(1, 'auto');
      // Go back to the first item. The second should be a partial again.
      rendered.getInstance().scrollToItem(0, 'auto');
      // None of the scrollToItem calls above should actually cause a scroll,
      // so there will only be one snapshot.
      expect(onItemsDisplayed.mock.calls).toMatchSnapshot();
    });

    it('should scroll to the correct item for align = "start"', () => {
      const rendered = ReactTestRenderer.create(
        <SimpleList {...defaultProps} />
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
      expect(onItemsDisplayed.mock.calls).toMatchSnapshot();
    });

    it('should scroll to the correct item for align = "end"', () => {
      const rendered = ReactTestRenderer.create(
        <SimpleList {...defaultProps} />
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
      expect(onItemsDisplayed.mock.calls).toMatchSnapshot();
    });

    it('should scroll to the correct item for align = "center"', () => {
      const rendered = ReactTestRenderer.create(
        <SimpleList {...defaultProps} />
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
      expect(onItemsDisplayed.mock.calls).toMatchSnapshot();
    });

    it('should scroll to the correct item for align = "smart"', () => {
      const rendered = ReactTestRenderer.create(
        <SimpleList {...defaultProps} />
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
      expect(onItemsDisplayed.mock.calls).toMatchSnapshot();
    });

    it('should ignore indexes less than zero', () => {
      const instance = ReactDOM.render(
        <SimpleList {...defaultProps} />,
        document.createElement('div')
      );
      instance.scrollToItem(20);
      onItemsDisplayed.mockClear();
      instance.scrollToItem(-1);
      expect(onItemsDisplayed.mock.calls).toMatchSnapshot();
    });

    it('should ignore indexes greater than itemCount', () => {
      const instance = ReactDOM.render(
        <SimpleList {...defaultProps} />,
        document.createElement('div')
      );
      onItemsDisplayed.mockClear();
      instance.scrollToItem(defaultProps.itemCount * 2);
      expect(onItemsDisplayed.mock.calls).toMatchSnapshot();
    });
  });

  // onItemsDisplayed is pretty well covered by other snapshot tests
  describe('onScroll', () => {
    it('should not call onScroll on mount (since no scrolling occurred)', () => {
      const onScroll = jest.fn();
      ReactDOM.render(
        <SimpleList {...defaultProps} onScroll={onScroll} />,
        document.createElement('div')
      );
      expect(onScroll).not.toHaveBeenCalled();
    });

    it('should call onScroll when scroll position changes', () => {
      const onScroll = jest.fn(event => {
        expect(event.target.scrollTop).toBe(10);
      });
      const instance = ReactDOM.render(
        <SimpleList {...defaultProps} onScroll={onScroll} />,
        document.createElement('div')
      );
      simulateScroll(instance, 10);
      expect(onScroll).toHaveBeenCalledTimes(1);
    });

    it('scrolling should report partial items correctly in onItemsDisplayed', () => {
      // Use ReactDOM renderer so the container ref works correctly.
      const instance = ReactDOM.render(
        <SimpleList {...defaultProps} initialScrollOffset={20} />,
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
      expect(onItemsDisplayed.mock.calls).toMatchSnapshot();
    });
  });

  describe('itemKey', () => {
    it('should be used', () => {
      const itemKey = jest.fn(index => index);
      ReactTestRenderer.create(
        <SimpleList {...defaultProps} itemCount={3} itemKey={itemKey} />
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
        <SimpleList
          {...defaultProps}
          itemCount={3}
          itemRenderer={props => <ItemRenderer {...props} />}
          itemKey={itemKey}
        />
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
  });

  describe('refs', () => {
    it('should pass through innerRef and outerRef ref functions', () => {
      const innerRef = jest.fn();
      const outerRef = jest.fn();
      ReactDOM.render(
        <SimpleList
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
        <SimpleList
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
        <SimpleList {...defaultProps} innerElementType="section" />
      );
      expect(rendered.root.findByType('section')).toBeDefined();
    });

    it('should use a custom outerElementType if specified', () => {
      const rendered = ReactTestRenderer.create(
        <SimpleList {...defaultProps} outerElementType="section" />
      );
      expect(rendered.root.findByType('section')).toBeDefined();
    });

    it('should support spreading additional, arbitrary props, e.g. id', () => {
      const container = document.createElement('div');
      ReactDOM.render(
        <SimpleList
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
  });

  describe('props validation', () => {
    beforeEach(() => spyOn(console, 'error'));

    it('should fail if non-numeric itemSize is provided', () => {
      expect(() =>
        ReactTestRenderer.create(
          <SimpleList {...defaultProps} itemSize="abc" />
        )
      ).toThrow(
        'An invalid "itemSize" prop has been specified. ' +
          'Value should be a number. ' +
          '"string" was specified.'
      );
    });

    it('should fail if no itemRenderer value is provided', () => {
      expect(() =>
        ReactTestRenderer.create(
          <SimpleList {...defaultProps} itemRenderer={undefined} />
        )
      ).toThrow(
        'An invalid "itemRenderer" prop has been specified. ' +
          'Value should be a function that returns React elements. ' +
          '"undefined" was specified.'
      );
    });

    it('should fail if a string height is provided for a vertical list', () => {
      expect(() =>
        ReactTestRenderer.create(
          <SimpleList {...defaultProps} layout="vertical" height="100%" />
        )
      ).toThrow(
        'An invalid "height" prop has been specified. ' +
          'Lists must specify a number for height. ' +
          '"string" was specified.'
      );
    });
  });
});
