import React, {
  createRef,
  forwardRef,
  PureComponent,
  unstable_Profiler as Profiler,
} from 'react';
import { findDOMNode, render } from 'react-dom';
import { DynamicSizeList } from '..';

describe('DynamicSizeList', () => {
  let container,
    defaultProps,
    innerRef,
    itemRenderer,
    itemSizes,
    onItemsRendered;

  // Use PureComponent to test memoization.
  // Pass through to itemRenderer mock for easier test assertions.
  class PureItemRenderer extends PureComponent {
    componentDidMount() {
      const { index } = this.props;

      const itemSize = itemSizes[index % itemSizes.length];

      // Hack around the fact that JSDom doesn't support measurements.
      const node = findDOMNode(this);
      Object.defineProperty(node, 'offsetHeight', {
        configurable: true,
        get: () => itemSize,
      });
      Object.defineProperty(node, 'offsetWidth', {
        configurable: true,
        get: () => itemSize,
      });
    }

    render() {
      return itemRenderer(this.props);
    }
  }

  const RefForwarder = forwardRef((props, ref) => (
    <PureItemRenderer {...props} forwardedRef={ref} />
  ));

  beforeEach(() => {
    jest.useFakeTimers();

    container = document.createElement('div');

    itemSizes = [20, 25, 30, 35, 40];
    itemRenderer = jest.fn(({ forwardedRef, style, ...rest }) => (
      <div ref={forwardedRef} style={style}>
        {JSON.stringify(rest, null, 2)}
      </div>
    ));
    onItemsRendered = jest.fn();
    innerRef = createRef();
    defaultProps = {
      children: RefForwarder,
      estimatedItemSize: 25,
      height: 100,
      innerRef,
      itemCount: 20,
      onItemsRendered,
      overscanCount: 1,
      width: 50,
    };
  });

  // Much of the shared List functionality is already tested by FixedSizeList tests.
  // This test covers functionality that is unique to DynamicSizeList.

  it('should measure and position items after mounting', () => {
    const onRender = jest.fn(() => {
      switch (onRender.mock.calls.length) {
        case 1:
          // Initial render uses estimatedItemSize for scrollHeight.
          expect(innerRef.current.style.height).toBe('500px');

          // Given estimatedItemSize and overscanCount, we expect to render 5 items.
          expect(innerRef.current.children).toHaveLength(5);
          break;
        case 2:
          // Second render should adjust scrollHeight for newly measured items.
          expect(innerRef.current.style.height).toBe('525px');

          // Newly measured items should be positioned correctly.
          Array.from(innerRef.current.children).forEach((node, index) => {
            expect(node.style.top).toBe(`${index * 30}px`);
          });
          break;
        default:
          throw Error('Unexpected render');
      }
    });

    itemSizes = [30];

    render(
      <Profiler id="test" onRender={onRender}>
        <DynamicSizeList {...defaultProps} />
      </Profiler>,
      container
    );

    expect(onRender.mock.calls).toHaveLength(2);
  });

  describe('ref forwarding', () => {
    it('should warn if ref is not forwarded', () => {
      class ItemRenderer extends PureComponent {
        render() {
          const { index, style } = this.props;
          return <div style={style}>{index}</div>;
        }
      }

      console.warn = jest.fn();
      render(
        <DynamicSizeList {...defaultProps} itemCount={5}>
          {ItemRenderer}
        </DynamicSizeList>,
        container
      );
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn.mock.calls[0][0]).toContain(
        'The item renderer "ItemRenderer" did not attach a ref'
      );

      // It should only warn once per item renderer type to avoid spamming the console.
      render(
        <DynamicSizeList {...defaultProps} itemCount={10}>
          {ItemRenderer}
        </DynamicSizeList>,
        container
      );
      expect(console.warn).toHaveBeenCalledTimes(1);
    });
  });
});
