import React, { createRef, forwardRef, PureComponent } from 'react';
import ReactDOM from 'react-dom';
import ReactTestRenderer from 'react-test-renderer';
import ReactTestUtils from 'react-dom/test-utils';
import { FixedSizeGrid } from '..';
import * as domHelpers from '../domHelpers';

const findScrollContainer = rendered => rendered.root.children[0].children[0];

const simulateScroll = (instance, { scrollLeft, scrollTop }) => {
  instance._outerRef.scrollLeft = scrollLeft;
  instance._outerRef.scrollTop = scrollTop;
  ReactTestUtils.Simulate.scroll(instance._outerRef);
};

describe('FixedSizeGrid', () => {
  let defaultProps, getScrollbarSize, itemRenderer, onItemsRendered;

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

    // Mock the DOM helper util for testing purposes.
    getScrollbarSize = domHelpers.getScrollbarSize = jest.fn(() => 0);

    onItemsRendered = jest.fn();

    itemRenderer = jest.fn(({ style, ...rest }) => (
      <div style={style}>{JSON.stringify(rest, null, 2)}</div>
    ));
    defaultProps = {
      children: PureItemRenderer,
      columnCount: 100,
      columnWidth: 100,
      height: 100,
      onItemsRendered,
      rowCount: 100,
      rowHeight: 25,
      width: 200,
    };
  });

  it('should render an empty grid', () => {
    ReactTestRenderer.create(
      <FixedSizeGrid {...defaultProps} columnCount={0} rowCount={0} />
    );
    ReactTestRenderer.create(
      <FixedSizeGrid {...defaultProps} columnCount={0} />
    );
    ReactTestRenderer.create(<FixedSizeGrid {...defaultProps} rowCount={0} />);
    expect(itemRenderer).not.toHaveBeenCalled();
    expect(onItemsRendered).not.toHaveBeenCalled();
  });

  it('should render a grid of items', () => {
    ReactTestRenderer.create(<FixedSizeGrid {...defaultProps} />);
    expect(itemRenderer).toHaveBeenCalledTimes(15);
    expect(onItemsRendered.mock.calls).toMatchSnapshot();
  });

  describe('style caching', () => {
    it('should cache styles while scrolling to avoid breaking pure sCU for items', () => {
      const rendered = ReactTestRenderer.create(
        <FixedSizeGrid {...defaultProps} />
      );
      // Scroll a few times.
      // Each time, make sure to render row 3, column 1.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 1, rowIndex: 1, align: 'start' });
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 1, rowIndex: 2, align: 'start' });
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 1, rowIndex: 3, align: 'start' });
      // Find all of the times row 3, column 1 was rendered.
      // If we are caching props correctly, it should only be once.
      expect(
        itemRenderer.mock.calls.filter(
          ([params]) => params.rowIndex === 3 && params.columnIndex === 1
        )
      ).toHaveLength(1);
    });

    it('should reset cached styles when scrolling stops', () => {
      // Use ReactDOM renderer so the container ref and "onScroll" event work correctly.
      const instance = ReactDOM.render(
        <FixedSizeGrid {...defaultProps} useIsScrolling />,
        document.createElement('div')
      );
      // Scroll, then capture the rendered style for item 1,
      // Then let the debounce timer clear the cached styles.
      simulateScroll(instance, { scrollLeft: 100, scrollTop: 25 });
      expect(itemRenderer).toHaveBeenCalled();
      const itemOneArgsA = itemRenderer.mock.calls.find(
        ([params]) => params.columnIndex === 1 && params.rowIndex === 1
      );
      jest.runAllTimers();
      itemRenderer.mockClear();
      // Scroll again, then capture the rendered style for item 1,
      // And confirm that the style was recreated.
      simulateScroll(instance, { scrollLeft: 0, scrollTop: 0 });
      expect(itemRenderer).toHaveBeenCalled();
      const itemOneArgsB = itemRenderer.mock.calls.find(
        ([params]) => params.columnIndex === 1 && params.rowIndex === 1
      );
      expect(itemOneArgsA[0].style).not.toBe(itemOneArgsB[0].style);
    });
  });

  it('changing item size updates the rendered items', () => {
    const rendered = ReactTestRenderer.create(
      <FixedSizeGrid {...defaultProps} />
    );
    rendered.update(<FixedSizeGrid {...defaultProps} columnWidth={150} />);
    rendered.update(
      <FixedSizeGrid {...defaultProps} columnWidth={150} rowHeight={50} />
    );
    expect(onItemsRendered.mock.calls).toMatchSnapshot();
  });

  it('changing itemSize updates the rendered items and busts the style cache', () => {
    const rendered = ReactTestRenderer.create(
      <FixedSizeGrid {...defaultProps} />
    );
    const styleOne = itemRenderer.mock.calls[0][0].style;
    itemRenderer.mockClear();
    rendered.update(<FixedSizeGrid {...defaultProps} columnWidth={150} />);
    expect(itemRenderer).toHaveBeenCalled();
    const styleTwo = itemRenderer.mock.calls[0][0].style;
    expect(styleOne).not.toBe(styleTwo);
    itemRenderer.mockClear();
    rendered.update(
      <FixedSizeGrid {...defaultProps} columnWidth={150} rowHeight={50} />
    );
    const styleThree = itemRenderer.mock.calls[0][0].style;
    expect(styleTwo).not.toBe(styleThree);
  });

  it('should support momentum scrolling on iOS devices', () => {
    const rendered = ReactTestRenderer.create(
      <FixedSizeGrid {...defaultProps} />
    );
    expect(rendered.toJSON().props.style.WebkitOverflowScrolling).toBe('touch');
  });

  it('should disable pointer events while scrolling', () => {
    const rendered = ReactTestRenderer.create(
      <FixedSizeGrid {...defaultProps} />
    );
    const scrollContainer = findScrollContainer(rendered);
    expect(scrollContainer.props.style.pointerEvents).toBe(undefined);
    rendered.getInstance().setState({ isScrolling: true });
    expect(scrollContainer.props.style.pointerEvents).toBe('none');
  });

  describe('style overrides', () => {
    it('should support className prop', () => {
      const rendered = ReactTestRenderer.create(
        <FixedSizeGrid {...defaultProps} className="custom" />
      );
      expect(rendered.toJSON().props.className).toBe('custom');
    });

    it('should support style prop', () => {
      const rendered = ReactTestRenderer.create(
        <FixedSizeGrid {...defaultProps} style={{ backgroundColor: 'red' }} />
      );
      expect(rendered.toJSON().props.style.backgroundColor).toBe('red');
    });
  });

  describe('direction', () => {
    it('should set the appropriate CSS direction style', () => {
      const renderer = ReactTestRenderer.create(
        <FixedSizeGrid {...defaultProps} direction="ltr" />
      );
      expect(renderer.toJSON().props.style.direction).toBe('ltr');
      renderer.update(<FixedSizeGrid {...defaultProps} direction="rtl" />);
      expect(renderer.toJSON().props.style.direction).toBe('rtl');
    });

    it('should position items correctly', () => {
      const renderer = ReactTestRenderer.create(
        <FixedSizeGrid {...defaultProps} direction="ltr" />
      );

      let params = itemRenderer.mock.calls[0][0];
      expect(params.columnIndex).toBe(0);
      expect(params.rowIndex).toBe(0);
      let style = params.style;
      expect(style.left).toBe(0);
      expect(style.right).toBeUndefined();

      itemRenderer.mockClear();

      renderer.update(<FixedSizeGrid {...defaultProps} direction="rtl" />);

      params = itemRenderer.mock.calls[0][0];
      expect(params.columnIndex).toBe(0);
      expect(params.rowIndex).toBe(0);
      style = params.style;
      expect(style.left).toBeUndefined();
      expect(style.right).toBe(0);
    });
  });

  describe('overscanColumnCount and overscanRowCount', () => {
    it('should require a minimum of 1 overscan to support tabbing', () => {
      ReactTestRenderer.create(
        <FixedSizeGrid
          {...defaultProps}
          initialScrollLeft={250}
          initialScrollTop={250}
          overscanColumnCount={0}
          overscanRowCount={0}
        />
      );
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('should overscan in the direction being scrolled', () => {
      const rendered = ReactTestRenderer.create(
        <FixedSizeGrid
          {...defaultProps}
          initialScrollLeft={250}
          initialScrollTop={250}
          overscanColumnCount={2}
          overscanRowCount={2}
        />
      );
      rendered.getInstance().scrollTo({ scrollLeft: 1000, scrollTop: 1000 });
      rendered.getInstance().scrollTo({ scrollLeft: 500, scrollTop: 500 });
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('should overscan in both directions when not scrolling', () => {
      ReactTestRenderer.create(
        <FixedSizeGrid
          {...defaultProps}
          initialScrollLeft={250}
          initialScrollTop={250}
          overscanColumnCount={2}
          overscanRowCount={2}
        />
      );
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('should accommodate a custom overscan', () => {
      ReactTestRenderer.create(
        <FixedSizeGrid
          {...defaultProps}
          initialScrollLeft={250}
          initialScrollTop={250}
          overscanColumnCount={2}
          overscanRowCount={2}
        />
      );
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('should not scan past the beginning of the grid', () => {
      ReactTestRenderer.create(<FixedSizeGrid {...defaultProps} />);
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('should not scan past the end of the grid', () => {
      ReactTestRenderer.create(
        <FixedSizeGrid
          {...defaultProps}
          columnCount={10}
          initialScrollLeft={900}
          initialScrollTop={150}
          rowCount={10}
        />
      );
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    describe('overscanCount', () => {
      it('should warn about deprecated overscanCount prop', () => {
        spyOn(console, 'warn');

        const renderer = ReactTestRenderer.create(
          <FixedSizeGrid {...defaultProps} overscanCount={1} />
        );
        expect(console.warn).toHaveBeenCalledTimes(1);
        expect(console.warn).toHaveBeenLastCalledWith(
          'The overscanCount prop has been deprecated. ' +
            'Please use the overscanColumnCount and overscanRowCount props instead.'
        );

        renderer.update(<FixedSizeGrid {...defaultProps} overscanCount={1} />);

        // But it should only warn once.
        expect(console.warn).toHaveBeenCalledTimes(1);
      });

      it('should warn about deprecated overscanRowsCount or overscanColumnsCount prop', () => {
        spyOn(console, 'warn');

        const renderer = ReactTestRenderer.create(
          <FixedSizeGrid
            {...defaultProps}
            overscanRowsCount={1}
            overscanColumnsCount={1}
          />
        );
        expect(console.warn).toHaveBeenCalledTimes(1);
        expect(console.warn).toHaveBeenLastCalledWith(
          'The overscanColumnsCount and overscanRowsCount props have been deprecated. ' +
            'Please use the overscanColumnCount and overscanRowCount props instead.'
        );

        renderer.update(
          <FixedSizeGrid
            {...defaultProps}
            overscanRowsCount={1}
            overscanColumnsCount={1}
          />
        );

        // But it should only warn once.
        expect(console.warn).toHaveBeenCalledTimes(1);
      });

      it('should use overscanColumnsCount if both it and overscanCount are provided', () => {
        spyOn(console, 'warn');

        ReactTestRenderer.create(
          <FixedSizeGrid
            {...defaultProps}
            initialScrollLeft={100}
            initialScrollTop={100}
            overscanColumnsCount={3}
            overscanCount={2}
          />
        );
        expect(onItemsRendered.mock.calls).toMatchSnapshot();
      });

      it('should use overscanRowCount if both it and overscanCount are provided', () => {
        spyOn(console, 'warn');

        ReactTestRenderer.create(
          <FixedSizeGrid
            {...defaultProps}
            initialScrollLeft={100}
            initialScrollTop={100}
            overscanCount={2}
            overscanRowCount={3}
          />
        );
        expect(onItemsRendered.mock.calls).toMatchSnapshot();
      });

      it('should use overscanColumnCount and overscanRowCount if both them and deprecated props are provided', () => {
        spyOn(console, 'warn');

        ReactTestRenderer.create(
          <FixedSizeGrid
            {...defaultProps}
            initialScrollLeft={100}
            initialScrollTop={100}
            overscanCount={1}
            overscanColumnsCount={2}
            overscanColumnCount={3}
            overscanRowsCount={2}
            overscanRowCount={3}
          />
        );
        expect(onItemsRendered.mock.calls).toMatchSnapshot();
      });

      it('should support deprecated overscanCount', () => {
        spyOn(console, 'warn');

        ReactTestRenderer.create(
          <FixedSizeGrid
            {...defaultProps}
            initialScrollLeft={100}
            initialScrollTop={100}
            overscanCount={2}
          />
        );
        expect(onItemsRendered.mock.calls).toMatchSnapshot();
      });

      it('should support deprecated overscanColumnsCount and overscanRowsCount', () => {
        spyOn(console, 'warn');

        ReactTestRenderer.create(
          <FixedSizeGrid
            {...defaultProps}
            initialScrollLeft={100}
            initialScrollTop={100}
            overscanColumnsCount={2}
            overscanRowsCount={2}
          />
        );
        expect(onItemsRendered.mock.calls).toMatchSnapshot();
      });
    });
  });

  describe('useIsScrolling', () => {
    it('should not pass an isScrolling param to children unless requested', () => {
      ReactTestRenderer.create(<FixedSizeGrid {...defaultProps} />);
      expect(itemRenderer.mock.calls[0][0].isScrolling).toBe(undefined);
    });

    it('should pass an isScrolling param to children if requested', () => {
      // Use ReactDOM renderer so the container ref and "onScroll" event work correctly.
      const instance = ReactDOM.render(
        <FixedSizeGrid {...defaultProps} useIsScrolling />,
        document.createElement('div')
      );
      expect(itemRenderer.mock.calls[0][0].isScrolling).toBe(false);
      itemRenderer.mockClear();
      simulateScroll(instance, { scrollLeft: 300, scrollTop: 400 });
      expect(itemRenderer.mock.calls[0][0].isScrolling).toBe(true);
      itemRenderer.mockClear();
      jest.runAllTimers();
      expect(itemRenderer.mock.calls[0][0].isScrolling).toBe(false);
    });

    it('should not re-render children unnecessarily if isScrolling param is not used', () => {
      // Use ReactDOM renderer so the container ref and "onScroll" event work correctly.
      const instance = ReactDOM.render(
        <FixedSizeGrid {...defaultProps} />,
        document.createElement('div')
      );
      simulateScroll(instance, { scrollLeft: 300, scrollTop: 400 });
      itemRenderer.mockClear();
      jest.runAllTimers();
      expect(itemRenderer).not.toHaveBeenCalled();
    });
  });

  describe('scrollTo method', () => {
    it('should not report isScrolling', () => {
      // Use ReactDOM renderer so the container ref and "onScroll" event work correctly.
      const instance = ReactDOM.render(
        <FixedSizeGrid {...defaultProps} useIsScrolling />,
        document.createElement('div')
      );
      itemRenderer.mockClear();
      instance.scrollTo({ scrollLeft: 100, scrollTop: 100 });
      expect(itemRenderer.mock.calls[0][0].isScrolling).toBe(false);
    });

    it('should allow only scrollLeft or scrollTop values to be specified', () => {
      const instance = ReactDOM.render(
        <FixedSizeGrid {...defaultProps} useIsScrolling />,
        document.createElement('div')
      );

      instance.scrollTo({ scrollLeft: 100, scrollTop: 100 });
      expect(onItemsRendered).toHaveBeenLastCalledWith(
        expect.objectContaining({
          visibleColumnStartIndex: 1,
          visibleColumnStopIndex: 2,
          visibleRowStartIndex: 4,
          visibleRowStopIndex: 7,
        })
      );

      itemRenderer.mockClear();
      instance.scrollTo({ scrollTop: 200 });
      expect(onItemsRendered).toHaveBeenCalled();
      expect(onItemsRendered).toHaveBeenLastCalledWith(
        expect.objectContaining({
          visibleColumnStartIndex: 1,
          visibleColumnStopIndex: 2,
        })
      );

      itemRenderer.mockClear();
      instance.scrollTo({ scrollLeft: 150 });
      expect(onItemsRendered).toHaveBeenCalled();
      expect(onItemsRendered).toHaveBeenLastCalledWith(
        expect.objectContaining({
          visibleRowStartIndex: 8,
          visibleRowStopIndex: 11,
        })
      );
    });

    it('should ignore offsets less than zero', () => {
      const onScroll = jest.fn();
      const instance = ReactDOM.render(
        <FixedSizeGrid {...defaultProps} onScroll={onScroll} />,
        document.createElement('div')
      );
      instance.scrollTo({ scrollLeft: 100, scrollTop: 100 });
      onScroll.mockClear();
      instance.scrollTo({ scrollLeft: -1, scrollTop: -1 });
      expect(onScroll.mock.calls[0][0].scrollLeft).toBe(0);
      expect(onScroll.mock.calls[0][0].scrollTop).toBe(0);
    });
  });

  describe('scrollToItem method', () => {
    it('should not set invalid offsets when the list contains few items', () => {
      const rendered = ReactTestRenderer.create(
        <FixedSizeGrid {...defaultProps} columnCount={1} rowCount={2} />
      );
      expect(onItemsRendered).toMatchSnapshot();
      onItemsRendered.mockClear();
      rendered.getInstance().scrollToItem(0);
      expect(onItemsRendered).not.toHaveBeenCalled();
    });

    it('should scroll to the correct item for align = "auto"', () => {
      const rendered = ReactTestRenderer.create(
        <FixedSizeGrid {...defaultProps} />
      );
      // Scroll down enough to show item 10 at the bottom.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 10, rowIndex: 10, align: 'auto' });
      // No need to scroll again; item 9 is already visible.
      // Overscan indices will change though, since direction changes.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 9, rowIndex: 9, align: 'auto' });
      // Scroll up enough to show item 2 at the top.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 2, rowIndex: 2, align: 'auto' });
      // Scroll down to row 10, without changing scrollLeft
      rendered.getInstance().scrollToItem({ rowIndex: 10, align: 'auto' });
      // Scroll left to column 0, without changing scrollTop
      rendered.getInstance().scrollToItem({ columnIndex: 0, align: 'auto' });
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('scroll with align = "auto" should work with partially-visible items', () => {
      const rendered = ReactTestRenderer.create(
        // Create list where items don't fit exactly into container.
        // The container has space for 3 1/3 items.
        <FixedSizeGrid {...defaultProps} columnWidth={70} rowHeight={30} />
      );
      // Scroll down enough to show row 10 at the bottom a nd column 10 at the right.
      // Should show 4 rows: 3 full and one partial at the beginning
      // Should show 3 columns: 2 full and one partial at the beginning
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 10, rowIndex: 10, align: 'auto' });
      // No need to scroll again; row and column 9 are already visible.
      // Because there's no scrolling, it won't call onItemsRendered.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 9, rowIndex: 9, align: 'auto' });
      // Scroll to near the end. row 96 and column 97 will be partly visible.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 99, rowIndex: 99, align: 'auto' });
      // Scroll back to row 91 and column 97.
      // This will cause row 99 and column 99 to be partly viisble
      // Even though a scroll happened,  none of the items rendered have changed.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 97, rowIndex: 96, align: 'auto' });
      // Scroll forward again. Because row and column #99 were already partly visible,
      // all props of the onItemsRendered will be the same.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 99, rowIndex: 99, align: 'auto' });
      // Scroll to the second row and column.
      // This should leave row 4 and column 3 partly visible.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 1, rowIndex: 1, align: 'auto' });
      // Scroll to the first row and column.
      // This should leave row 3 and column 2 partly visible.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 0, rowIndex: 0, align: 'auto' });
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('should scroll to the correct item for align = "auto" at the bottom of the grid', () => {
      getScrollbarSize.mockImplementation(() => 20);

      const rendered = ReactTestRenderer.create(
        <FixedSizeGrid {...defaultProps} rowCount={20} rowHeight={30} />
      );
      onItemsRendered.mockClear();

      // Scroll down to the last row in the list.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 5, rowIndex: 19, align: 'auto' });

      expect(onItemsRendered).toHaveBeenCalledTimes(1);
      expect(onItemsRendered).toHaveBeenLastCalledWith(
        expect.objectContaining({
          visibleRowStartIndex: 17,
          visibleRowStopIndex: 19,
        })
      );
      // Repeat the previous scrollToItem call.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 5, rowIndex: 19, align: 'auto' });

      // Shouldn't have been called again
      expect(onItemsRendered).toHaveBeenCalledTimes(1);
      expect(onItemsRendered).toHaveBeenLastCalledWith(
        expect.objectContaining({
          visibleRowStartIndex: 17,
          visibleRowStopIndex: 19,
        })
      );
    });

    it('should scroll to the correct item for align = "auto" at the right hand side of the grid', () => {
      getScrollbarSize.mockImplementation(() => 20);

      const rendered = ReactTestRenderer.create(
        <FixedSizeGrid
          {...defaultProps}
          columnCount={20}
          columnWidth={50}
          width={120}
        />
      );
      onItemsRendered.mockClear();

      // Scroll across to the last row in the list.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 19, rowIndex: 19, align: 'auto' });

      expect(onItemsRendered).toHaveBeenCalledTimes(1);
      expect(onItemsRendered).toHaveBeenLastCalledWith(
        expect.objectContaining({
          visibleColumnStartIndex: 18,
          visibleColumnStopIndex: 19,
        })
      );
      // Repeat the previous scrollToItem call.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 19, rowIndex: 19, align: 'auto' });

      // Shouldn't have been called again
      expect(onItemsRendered).toHaveBeenCalledTimes(1);
      expect(onItemsRendered).toHaveBeenLastCalledWith(
        expect.objectContaining({
          visibleColumnStartIndex: 18,
          visibleColumnStopIndex: 19,
        })
      );
    });

    it('should scroll to the correct item for align = "start"', () => {
      const rendered = ReactTestRenderer.create(
        <FixedSizeGrid {...defaultProps} />
      );
      // Scroll down enough to show item 10 at the top.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 10, rowIndex: 10, align: 'start' });
      // Scroll back up so that item 9 is at the top.
      // Overscroll direction wil change too.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 9, rowIndex: 9, align: 'start' });
      // Item 99 can't align at the top because there aren't enough items.
      // Scroll down as far as possible though.
      // Overscroll direction wil change again.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 99, rowIndex: 99, align: 'start' });
      // Scroll up to row 10, without changing scrollLeft
      rendered.getInstance().scrollToItem({ rowIndex: 10, align: 'start' });
      // Scroll left to column 0, without changing scrollTop
      rendered.getInstance().scrollToItem({ columnIndex: 0, align: 'start' });
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('should scroll to the correct item for align = "end"', () => {
      const rendered = ReactTestRenderer.create(
        <FixedSizeGrid {...defaultProps} />
      );
      // Scroll down enough to show item 10 at the bottom.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 10, rowIndex: 10, align: 'end' });
      // Scroll back up so that item 9 is at the bottom.
      // Overscroll direction wil change too.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 9, rowIndex: 9, align: 'end' });
      // Item 1 can't align at the bottom because it's too close to the beginning.
      // Scroll up as far as possible though.
      // Overscroll direction wil change again.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 1, rowIndex: 1, align: 'end' });
      // Scroll down to row 10, without changing scrollLeft
      rendered.getInstance().scrollToItem({ rowIndex: 10, align: 'end' });
      // Scroll right to column 9, without changing scrollTop
      rendered.getInstance().scrollToItem({ columnIndex: 9, align: 'end' });
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('should scroll to the correct item for align = "center"', () => {
      const rendered = ReactTestRenderer.create(
        <FixedSizeGrid {...defaultProps} />
      );
      // Scroll down enough to show item 10 in the middle.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 10, rowIndex: 10, align: 'center' });
      // Scroll back up so that item 9 is in the middle.
      // Overscroll direction wil change too.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 9, rowIndex: 9, align: 'center' });
      // Item 1 can't align in the middle because it's too close to the beginning.
      // Scroll up as far as possible though.
      // Overscroll direction wil change again.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 1, rowIndex: 1, align: 'center' });
      // Item 99 can't align in the middle because it's too close to the end.
      // Scroll down as far as possible though.
      // Overscroll direction wil change again.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 99, rowIndex: 99, align: 'center' });
      // Scroll up to row 10, without changing scrollLeft
      rendered.getInstance().scrollToItem({ rowIndex: 10, align: 'center' });
      // Scroll left to column 3, without changing scrollTop
      rendered.getInstance().scrollToItem({ columnIndex: 3, align: 'center' });
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('should scroll to the correct item for align = "smart"', () => {
      const rendered = ReactTestRenderer.create(
        <FixedSizeGrid {...defaultProps} />
      );

      // Scroll down enough to show item 10 at the center.
      // It was further than one screen away, so it gets centered.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 10, rowIndex: 10, align: 'smart' });
      // No need to scroll again; item 9 is already visible.
      // Overscan indices will change though, since direction changes.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 9, rowIndex: 9, align: 'smart' });
      // Scroll up enough to show item 2 as close to the center as we can.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 2, rowIndex: 2, align: 'smart' });
      // Scroll down to row 10, without changing scrollLeft
      rendered.getInstance().scrollToItem({ rowIndex: 10, align: 'smart' });
      // Scroll left to column 0, without changing scrollTop
      rendered.getInstance().scrollToItem({ columnIndex: 0, align: 'smart' });

      // Scrolling within a distance of a single screen from viewport
      // should have the 'auto' behavior of scrolling as little as possible.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 5, rowIndex: 5, align: 'smart' });
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 10, rowIndex: 10, align: 'smart' });
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('should not report isScrolling', () => {
      // Use ReactDOM renderer so the container ref and "onScroll" event work correctly.
      const instance = ReactDOM.render(
        <FixedSizeGrid {...defaultProps} useIsScrolling />,
        document.createElement('div')
      );
      itemRenderer.mockClear();
      instance.scrollToItem({ columnIndex: 15, rowIndex: 20 });
      expect(itemRenderer.mock.calls[0][0].isScrolling).toBe(false);
    });

    it('should account for scrollbar size', () => {
      const onScroll = jest.fn();
      const rendered = ReactTestRenderer.create(
        <FixedSizeGrid
          {...defaultProps}
          columnWidth={100}
          height={150}
          rowHeight={25}
          width={300}
          onScroll={onScroll}
        />
      );

      onScroll.mockClear();
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 15, rowIndex: 10, align: 'end' });

      // With hidden scrollbars (size === 0) we would expect...
      expect(onScroll).toHaveBeenCalledWith({
        horizontalScrollDirection: 'forward',
        scrollLeft: 1300,
        scrollTop: 125,
        scrollUpdateWasRequested: true,
        verticalScrollDirection: 'forward',
      });

      getScrollbarSize.mockImplementation(() => 20);

      onScroll.mockClear();
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 15, rowIndex: 10, align: 'end' });

      // With scrollbars of size 20 we would expect those values ot increase by 20px
      expect(onScroll).toHaveBeenCalledWith({
        horizontalScrollDirection: 'forward',
        scrollLeft: 1320,
        scrollTop: 145,
        scrollUpdateWasRequested: true,
        verticalScrollDirection: 'forward',
      });
    });

    it('should not account for scrollbar size when no scrollbar is visible for a particular direction', () => {
      getScrollbarSize.mockImplementation(() => 20);

      const onScroll = jest.fn();
      const rendered = ReactTestRenderer.create(
        <FixedSizeGrid
          {...defaultProps}
          columnCount={2}
          columnWidth={100}
          height={150}
          rowHeight={25}
          width={300}
          onScroll={onScroll}
        />
      );

      onScroll.mockClear();
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 0, rowIndex: 10, align: 'end' });

      // Since there aren't enough columns to require horizontal scrolling,
      // the additional 20px for the scrollbar should not be taken into consideration.
      expect(onScroll).toHaveBeenCalledWith({
        horizontalScrollDirection: 'backward',
        scrollLeft: 0,
        scrollTop: 125,
        scrollUpdateWasRequested: true,
        verticalScrollDirection: 'forward',
      });

      rendered.update(
        <FixedSizeGrid
          {...defaultProps}
          columnWidth={100}
          height={150}
          rowCount={4}
          rowHeight={25}
          width={300}
          onScroll={onScroll}
        />
      );

      onScroll.mockClear();
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 15, rowIndex: 0, align: 'end' });

      // Since there aren't enough rows to require vertical scrolling,
      // the additional 20px for the scrollbar should not be taken into consideration.
      expect(onScroll).toHaveBeenCalledWith({
        horizontalScrollDirection: 'forward',
        scrollLeft: 1300,
        scrollTop: 0,
        scrollUpdateWasRequested: true,
        verticalScrollDirection: 'backward',
      });
    });

    it('should ignore indexes less than zero', () => {
      const instance = ReactDOM.render(
        <FixedSizeGrid {...defaultProps} />,
        document.createElement('div')
      );
      instance.scrollToItem({ columnIndex: 20, rowIndex: 20 });
      onItemsRendered.mockClear();
      instance.scrollToItem({ columnIndex: -1, rowIndex: -1 });
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });

    it('should ignore indexes greater than itemCount', () => {
      const instance = ReactDOM.render(
        <FixedSizeGrid {...defaultProps} />,
        document.createElement('div')
      );
      onItemsRendered.mockClear();
      instance.scrollToItem({
        columnIndex: defaultProps.columnCount * 2,
        rowIndex: defaultProps.rowCount * 2,
      });
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });
  });

  // onItemsRendered is pretty well covered by other snapshot tests
  describe('onScroll', () => {
    it('should call onScroll after mount', () => {
      const onScroll = jest.fn();
      ReactTestRenderer.create(
        <FixedSizeGrid {...defaultProps} onScroll={onScroll} />
      );
      expect(onScroll.mock.calls).toMatchSnapshot();
    });

    it('should call onScroll when scroll position changes', () => {
      const onScroll = jest.fn();
      const rendered = ReactTestRenderer.create(
        <FixedSizeGrid {...defaultProps} onScroll={onScroll} />
      );
      rendered.getInstance().scrollTo({
        scrollLeft: 100,
        scrollTop: 50,
      });
      rendered.getInstance().scrollTo({
        scrollLeft: 0,
        scrollTop: 150,
      });
      rendered.getInstance().scrollTo({
        scrollLeft: 150,
        scrollTop: 0,
      });
      expect(onScroll.mock.calls).toMatchSnapshot();
    });

    it('should distinguish between "onScroll" events and scrollTo() calls', () => {
      const onScroll = jest.fn();
      // Use ReactDOM renderer so the container ref and "onScroll" event work correctly.
      const instance = ReactDOM.render(
        <FixedSizeGrid {...defaultProps} onScroll={onScroll} />,
        document.createElement('div')
      );

      onScroll.mockClear();
      instance.scrollTo({ scrollLeft: 100, scrollTop: 100 });
      expect(onScroll.mock.calls[0][0].scrollUpdateWasRequested).toBe(true);

      onScroll.mockClear();
      simulateScroll(instance, { scrollLeft: 200, scrollTop: 200 });
      expect(onScroll.mock.calls[0][0].scrollUpdateWasRequested).toBe(false);
    });

    it('scrolling should report partial items correctly in onItemsRendered', () => {
      // Use ReactDOM renderer so the container ref works correctly.
      const instance = ReactDOM.render(
        <FixedSizeGrid
          {...defaultProps}
          initialScrollLeft={20}
          initialScrollTop={10}
        />,
        document.createElement('div')
      );
      // grid 200w x 100h
      // columnWidth: 100, rowHeight: 25,
      // columnCount: 100, rowCount: 100
      // Scroll 2 items fwd, but thanks to the initialScrollOffset, we should
      // still be showing partials on both ends.
      instance.scrollTo({ scrollLeft: 150, scrollTop: 40 });
      // Scroll a little fwd to cause partials to be hidden
      instance.scrollTo({ scrollLeft: 200, scrollTop: 50 });
      // Scroll backwards to show partials again
      instance.scrollTo({ scrollLeft: 150, scrollTop: 40 });
      // Scroll near the end so that the last item is shown
      // as a partial.
      instance.scrollTo({
        scrollLeft: 98 * 100 - 5,
        scrollTop: 96 * 25 - 5,
      });
      // Scroll to the end. No partials.
      instance.scrollTo({
        scrollLeft: 98 * 100,
        scrollTop: 96 * 25,
      });
      // Verify that backwards scrolling near the end works OK.
      instance.scrollTo({
        scrollLeft: 98 * 100 - 5,
        scrollTop: 96 * 25 - 5,
      });
      expect(onItemsRendered.mock.calls).toMatchSnapshot();
    });
  });

  describe('itemKey', () => {
    it('should be used', () => {
      const itemKey = jest.fn(
        ({ columnIndex, rowIndex }) => `${rowIndex}:${columnIndex}`
      );
      ReactTestRenderer.create(
        <FixedSizeGrid
          {...defaultProps}
          columnCount={3}
          rowCount={2}
          itemKey={itemKey}
        />
      );
      expect(itemKey).toHaveBeenCalledTimes(6);
      expect(itemKey.mock.calls[0][0]).toEqual({
        columnIndex: 0,
        rowIndex: 0,
        virtualizedRowIndex: 0,
        virtualizedColumnIndex: 0,
      });
      expect(itemKey.mock.calls[1][0]).toEqual({
        columnIndex: 1,
        rowIndex: 0,
        virtualizedRowIndex: 0,
        virtualizedColumnIndex: 1,
      });
      expect(itemKey.mock.calls[2][0]).toEqual({
        columnIndex: 2,
        rowIndex: 0,
        virtualizedRowIndex: 0,
        virtualizedColumnIndex: 2,
      });
      expect(itemKey.mock.calls[3][0]).toEqual({
        columnIndex: 0,
        rowIndex: 1,
        virtualizedRowIndex: 1,
        virtualizedColumnIndex: 0,
      });
      expect(itemKey.mock.calls[4][0]).toEqual({
        columnIndex: 1,
        rowIndex: 1,
        virtualizedRowIndex: 1,
        virtualizedColumnIndex: 1,
      });
      expect(itemKey.mock.calls[5][0]).toEqual({
        columnIndex: 2,
        rowIndex: 1,
        virtualizedRowIndex: 1,
        virtualizedColumnIndex: 2,
      });
    });

    it('should allow items to be moved within the collection without causing caching problems', () => {
      const keyMap = [['0:0', '0:1:', '0:2'], ['1:0', '1:1:', '1:2']];
      const keyMapItemRenderer = jest.fn(({ index, style }) => (
        <div style={style}>{keyMap[index]}</div>
      ));
      class ItemRenderer extends PureComponent {
        render() {
          return keyMapItemRenderer(this.props);
        }
      }
      const itemKey = jest.fn(
        ({ columnIndex, rowIndex }) => keyMap[rowIndex][columnIndex]
      );
      const rendered = ReactTestRenderer.create(
        <FixedSizeGrid
          {...defaultProps}
          columnCount={3}
          rowCount={2}
          itemKey={itemKey}
        >
          {ItemRenderer}
        </FixedSizeGrid>
      );
      expect(itemKey).toHaveBeenCalledTimes(6);
      itemKey.mockClear();

      expect(keyMapItemRenderer).toHaveBeenCalledTimes(6);
      keyMapItemRenderer.mockClear();

      // Simulate swapping the first and last items.
      keyMap[0][0] = '1:2';
      keyMap[1][2] = '0:0';

      rendered.getInstance().forceUpdate();

      // Our key getter should be called again for each key.
      // Since we've modified the map, the first and last key will swap.
      expect(itemKey).toHaveBeenCalledTimes(6);

      // The first and third item have swapped place,
      // So they should have been re-rendered,
      // But the second item should not.
      expect(keyMapItemRenderer).toHaveBeenCalledTimes(2);
      expect(keyMapItemRenderer.mock.calls[0][0].columnIndex).toBe(0);
      expect(keyMapItemRenderer.mock.calls[0][0].rowIndex).toBe(0);
      expect(keyMapItemRenderer.mock.calls[1][0].columnIndex).toBe(2);
      expect(keyMapItemRenderer.mock.calls[1][0].rowIndex).toBe(1);
    });

    it('should receive a data value if itemData is provided', () => {
      const itemKey = jest.fn(
        ({ columnIndex, data, rowIndex }) => `${columnIndex}-${rowIndex}`
      );
      const itemData = {};
      ReactTestRenderer.create(
        <FixedSizeGrid
          {...defaultProps}
          itemData={itemData}
          itemKey={itemKey}
        />
      );
      expect(itemKey).toHaveBeenCalled();
      expect(
        itemKey.mock.calls.filter(([params]) => params.data === itemData)
      ).toHaveLength(itemKey.mock.calls.length);
    });

    it('should receive the correct virtualized row and column indexes when scrolled', () => {
      getScrollbarSize.mockImplementation(() => 20);
      const itemKey = jest.fn(
        ({ columnIndex, rowIndex }) => `${rowIndex}-${columnIndex}`
      );

      const rendered = ReactTestRenderer.create(
        <FixedSizeGrid
          {...defaultProps}
          width={100}
          height={25}
          itemKey={itemKey}
        />
      );
      onItemsRendered.mockClear();

      expect(itemKey).toHaveBeenCalledTimes(4);
      itemKey.mockClear();
      // Scroll across to the last row in the list.
      rendered
        .getInstance()
        .scrollToItem({ columnIndex: 19, rowIndex: 19, align: 'auto' });

      expect(itemKey).toHaveBeenCalledTimes(16);
      expect(itemKey.mock.calls).toMatchSnapshot();
    });
  });

  describe('refs', () => {
    it('should pass through innerRef and outerRef ref functions', () => {
      const innerRef = jest.fn();
      const outerRef = jest.fn();
      ReactDOM.render(
        <FixedSizeGrid
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
        <FixedSizeGrid
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
        <FixedSizeGrid {...defaultProps} innerElementType="section" />
      );
      expect(rendered.root.findByType('section')).toBeDefined();
    });

    it('should use a custom outerElementType if specified', () => {
      const rendered = ReactTestRenderer.create(
        <FixedSizeGrid {...defaultProps} outerElementType="section" />
      );
      expect(rendered.root.findByType('section')).toBeDefined();
    });

    it('should support spreading additional, arbitrary props, e.g. id', () => {
      const container = document.createElement('div');
      ReactDOM.render(
        <FixedSizeGrid
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
        <FixedSizeGrid
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
        <FixedSizeGrid
          {...defaultProps}
          innerTagName="div"
          outerTagName="div"
        />
      );

      // But it should only warn once.
      expect(console.warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('itemData', () => {
    it('should pass itemData to item renderers as a "data" prop', () => {
      const itemData = {};
      ReactTestRenderer.create(
        <FixedSizeGrid {...defaultProps} itemData={itemData} />
      );
      expect(itemRenderer).toHaveBeenCalled();
      expect(
        itemRenderer.mock.calls.filter(([params]) => params.data === itemData)
      ).toHaveLength(itemRenderer.mock.calls.length);
    });

    it('should re-render items if itemData changes', () => {
      const itemData = {};
      const rendered = ReactTestRenderer.create(
        <FixedSizeGrid {...defaultProps} itemData={itemData} />
      );
      expect(itemRenderer).toHaveBeenCalled();
      itemRenderer.mockClear();

      // Re-rendering should not affect pure sCU children:
      rendered.update(<FixedSizeGrid {...defaultProps} itemData={itemData} />);
      expect(itemRenderer).not.toHaveBeenCalled();

      // Re-rendering with new itemData should re-render children:
      const newItemData = {};
      rendered.update(
        <FixedSizeGrid {...defaultProps} itemData={newItemData} />
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

    it('should fail if non-numeric columnWidth is provided', () => {
      expect(() =>
        ReactTestRenderer.create(
          <FixedSizeGrid {...defaultProps} columnWidth="abc" />
        )
      ).toThrow(
        'An invalid "columnWidth" prop has been specified. ' +
          'Value should be a number. ' +
          '"string" was specified.'
      );
    });

    it('should fail if non-numeric rowHeight is provided', () => {
      expect(() =>
        ReactTestRenderer.create(
          <FixedSizeGrid {...defaultProps} rowHeight="abc" />
        )
      ).toThrow(
        'An invalid "rowHeight" prop has been specified. ' +
          'Value should be a number. ' +
          '"string" was specified.'
      );
    });

    it('should fail if no children value is provided', () => {
      expect(() =>
        ReactTestRenderer.create(
          <FixedSizeGrid {...defaultProps} children={undefined} />
        )
      ).toThrow(
        'An invalid "children" prop has been specified. ' +
          'Value should be a React component. ' +
          '"undefined" was specified.'
      );
    });

    it('should fail if an invalid direction is provided', () => {
      expect(() =>
        ReactTestRenderer.create(
          <FixedSizeGrid {...defaultProps} direction={null} />
        )
      ).toThrow(
        'An invalid "direction" prop has been specified. ' +
          'Value should be either "ltr" or "rtl". ' +
          '"null" was specified.'
      );
    });

    it('should fail if a string height is provided', () => {
      expect(() =>
        ReactTestRenderer.create(
          <FixedSizeGrid {...defaultProps} height="100%" />
        )
      ).toThrow(
        'An invalid "height" prop has been specified. ' +
          'Grids must specify a number for height. ' +
          '"string" was specified.'
      );
    });

    it('should fail if a string width is provided', () => {
      expect(() =>
        ReactTestRenderer.create(
          <FixedSizeGrid {...defaultProps} width="100%" />
        )
      ).toThrow(
        'An invalid "width" prop has been specified. ' +
          'Grids must specify a number for width. ' +
          '"string" was specified.'
      );
    });
  });
});
