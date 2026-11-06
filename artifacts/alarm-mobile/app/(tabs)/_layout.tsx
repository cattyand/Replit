import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

function AlarmTabBar({ state, descriptors, navigation }: any) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const orderedRoutes = ['index', 'profiles', 'settings'];
  const iconByRoute: Record<string, keyof typeof Feather.glyphMap> = {
    index: 'clock',
    profiles: 'layers',
    settings: 'settings',
  };
  const labelByRoute: Record<string, string> = {
    index: 'Sveglie',
    profiles: 'Profili',
    settings: 'Impostazioni',
  };

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: Math.max(insets.bottom, 8),
        paddingTop: 8,
        paddingHorizontal: 14,
        backgroundColor: 'rgba(19,21,32,0.96)',
        borderTopWidth: 1,
        borderTopColor: colors.border,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
      }}
    >
      {orderedRoutes.map((routeName, slot) => {
        const routeIndex = state.routes.findIndex((route: any) => route.name === routeName);
        const route = state.routes[routeIndex];
        if (!route) return null;
        const focused = state.index === routeIndex;
        const color = focused ? colors.foreground : colors.mutedForeground;
        return (
          <React.Fragment key={route.key}>
            {slot === 1 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Nuova sveglia"
                onPress={() => router.push('/alarm/new')}
                style={({ pressed }) => ({
                  width: 58,
                  height: 58,
                  marginTop: -32,
                  borderRadius: 30,
                  backgroundColor: colors.foreground,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.82 : 1,
                  elevation: 8,
                })}
              >
                <Feather name="plus" size={24} color={colors.background} />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 3 }}
            >
              <Feather name={iconByRoute[routeName]} size={19} color={color} />
              <Text style={{ color, fontSize: 11, fontWeight: focused ? '700' : '500' }}>{labelByRoute[routeName]}</Text>
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={props => <AlarmTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: '#131520' },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="profiles" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
