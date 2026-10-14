import { View } from 'react-native';
import { Text } from 'react-native-paper';
import * as React from 'react';
import { qpmLayoutTokens } from '../theme/tokens';

export default function Tag({
  text,
  backgroundColor,
  color
}: {
  text: string;
  color: string;
  backgroundColor: string;
}) {
  return (
    <View
      style={{
        backgroundColor,
        paddingHorizontal: qpmLayoutTokens.space.sm,
        paddingVertical: qpmLayoutTokens.space.xs,
        borderRadius: qpmLayoutTokens.radius.pill,
        alignSelf: 'flex-start'
      }}
    >
      <Text variant={'bodySmall'} style={{ color }}>
        {text}
      </Text>
    </View>
  );
}
