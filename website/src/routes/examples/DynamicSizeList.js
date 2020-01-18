import React, { PureComponent } from 'react';
import { DynamicSizeList as List } from 'react-window';
import loremIpsum from 'lorem-ipsum';
import CodeBlock from '../../components/CodeBlock';
import ProfiledExample from '../../components/ProfiledExample';

import CODE_HORIZONTAL from '../../code/DynamicSizeListHorizontal.js';
import CODE_VERTICAL from '../../code/DynamicSizeListVertical.js';

import styles from './shared.module.css';

// Polyfill ResizeObserver for demo
if (typeof ResizeObserver === 'undefined') {
  global.ResizeObserver = require('resize-observer-polyfill').default;
}

var colors = [
  ['#1E88E5', '#90CAF9'],
  ['#6D4C41', '#D7CCC8'],
  ['#212121', '#BDBDBD'],
  ['#388E3C', '#A5D6A7'],
  ['#E53935', '#EF9A9A'],
  ['#F4511E', '#FFAB91'],
  ['#8E24AA', '#E1BEE7'],
  ['#FFD600', '#FFF59D'],
];

const items = new Array(500).fill(true).map(() => {
  const text = loremIpsum({ units: 'paragraphs' });
  return {
    colors: colors[Math.floor(Math.random() * colors.length)],
    paragraph: text,
    isColumnExpanded: true,
    isRowExpanded: true,
    sentence: text.substr(0, text.indexOf('.')) + '…',
    word: loremIpsum({ units: 'words' }),
    words: loremIpsum({ units: 'words', count: 3 }),
  };
});

class Row extends PureComponent {
  toggleExpanded = () => {
    const { index } = this.props;
    // We mutate in place here rather than using setState,
    // Because it persists the data after unmount an remount.
    const item = items[index];
    item.isRowExpanded = !item.isRowExpanded;
    this.forceUpdate();
  };

  render() {
    const { index, forwardedRef, style } = this.props;
    const item = items[index];

    return (
      <div
        className={index % 2 ? styles.DynamicRowOdd : styles.DynamicRowEven}
        ref={forwardedRef}
        style={style}
      >
        <div
          className={styles.DynamicRowAvatar}
          style={{
            backgroundColor: item.colors[1],
            color: item.colors[0],
          }}
        >
          {index}
        </div>
        <div className={styles.DynamicRowText} onClick={this.toggleExpanded}>
          {item.isRowExpanded ? item.paragraph : item.sentence}
        </div>
      </div>
    );
  }
}

const RefForwardedColumn = React.forwardRef((props, ref) => (
  <Column {...props} forwardedRef={ref} />
));
const RefForwardedRow = React.forwardRef((props, ref) => (
  <Row {...props} forwardedRef={ref} />
));

class Column extends PureComponent {
  toggleExpanded = () => {
    const { index } = this.props;
    // We mutate in place here rather than using setState,
    // Because it persists the data after unmount an remount.
    const item = items[index];
    item.isColumnExpanded = !item.isColumnExpanded;
    this.forceUpdate();
  };

  render() {
    const { data: showText, forwardedRef, index, style } = this.props;
    const item = items[index];

    return (
      <div
        className={
          index % 2 ? styles.DynamicColumnOdd : styles.DynamicColumnEven
        }
        ref={forwardedRef}
        style={style}
      >
        <div
          className={styles.DynamicColumnAvatar}
          style={{
            backgroundColor: item.colors[1],
            color: item.colors[0],
          }}
        >
          {index}
        </div>
        {showText && (
          <div
            className={styles.DynamicColumnText}
            onClick={this.toggleExpanded}
          >
            {item.isColumnExpanded ? item.words : item.word}
          </div>
        )}
      </div>
    );
  }
}

export default class DynamicSizeList extends PureComponent {
  state = {
    halfSize: false,
    showText: true,
  };

  handleToggleResize = () =>
    this.setState(prevState => ({
      halfSize: !prevState.halfSize,
    }));

  handleToggleText = () =>
    this.setState(prevState => ({
      showText: !prevState.showText,
    }));

  render() {
    const { halfSize, showText } = this.state;

    return (
      <div className={styles.ExampleWrapper}>
        <h1 className={styles.ExampleHeader}>Dynamic Size List</h1>
        <div className={styles.Note}>
          <svg className={styles.NoteIcon} viewBox="0 0 24 24">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          </svg>
          <div>
            This component requires{' '}
            <a
              className={styles.NoteLink}
              href="https://wicg.github.io/ResizeObserver"
            >
              ResizeObserver
            </a>{' '}
            (or polyfill).
          </div>
        </div>
        <div className={styles.Example}>
          <ProfiledExample
            className={styles.ExampleDemo}
            sandbox="dynamic-size-list-vertical"
          >
            <button
              className={styles.ExampleButton}
              onClick={this.handleToggleResize}
            >
              Resize list
            </button>
            <List
              className={styles.List}
              height={200}
              itemCount={items.length}
              width={halfSize ? 200 : 300}
            >
              {RefForwardedRow}
            </List>
          </ProfiledExample>
          <div className={styles.ExampleCode}>
            <CodeBlock value={CODE_VERTICAL} />
          </div>
        </div>
        <div className={styles.Example}>
          <ProfiledExample
            className={styles.ExampleDemo}
            sandbox="dynamic-size-list-horizontal"
          >
            <button
              className={styles.ExampleButton}
              onClick={this.handleToggleText}
            >
              Toggle text
            </button>
            <List
              className={styles.List}
              layout="horizontal"
              height={50}
              itemCount={items.length}
              itemData={showText}
              width={300}
            >
              {RefForwardedColumn}
            </List>
          </ProfiledExample>
          <div className={styles.ExampleCode}>
            <CodeBlock value={CODE_HORIZONTAL} />
          </div>
        </div>
      </div>
    );
  }
}
