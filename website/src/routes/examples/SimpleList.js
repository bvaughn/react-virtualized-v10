import React from 'react';
import { SimpleList } from 'react-window';
import CodeBlock from '../../components/CodeBlock';
import ProfiledExample from '../../components/ProfiledExample';

import CODE from '../../code/SimpleList.js';

import styles from './shared.module.css';

export default function() {
  return (
    <div className={styles.ExampleWrapper}>
      <h1 className={styles.ExampleHeader}>Basic List</h1>
      <div className={styles.Example}>
        <ProfiledExample className={styles.ExampleDemo} sandbox="simple-list">
          <SimpleList
            className={styles.List}
            height={150}
            itemCount={1000}
            itemRenderer={({ index, key, style }) => (
              <div
                className={index % 2 ? styles.ListItemOdd : styles.ListItemEven}
                key={key}
                style={style}
              >
                Row {index}
              </div>
            )}
            itemSize={35}
            width={300}
          />
        </ProfiledExample>
        <div className={styles.ExampleCode}>
          <CodeBlock value={CODE} />
        </div>
      </div>
    </div>
  );
}
