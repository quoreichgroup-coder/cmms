import * as React from 'react';
import renderer from 'react-test-renderer';
import { PaperProvider } from 'react-native-paper';

import { MonoText } from '../StyledText';
import { customTheme } from '../../custom-theme';

it(`renders correctly`, () => {
  let tree;
  renderer.act(() => {
    tree = renderer.create(
      <PaperProvider theme={customTheme}>
        <MonoText>Snapshot test!</MonoText>
      </PaperProvider>
    );
  });

  expect(tree.toJSON()).toMatchSnapshot();
  renderer.act(() => tree.unmount());
});
