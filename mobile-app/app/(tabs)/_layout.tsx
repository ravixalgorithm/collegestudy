import { Tabs } from "expo-router";
import {
  Home,
  FileText,
  Clock,
  Calendar,
  User,
  HomeIcon,
  Bookmark,
  AlarmClock,
  CalendarPlus,
  UserCircle,
} from "lucide-react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0066cc",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: "#e5e5e5",
          backgroundColor: "#fff",
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) =>
            focused ? <HomeIcon color={color} size={size} /> : <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: "Notes",
          tabBarIcon: ({ color, size, focused }) =>
            focused ? <Bookmark color={color} size={size} /> : <FileText color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="timetable"
        options={{
          title: "Schedule",
          tabBarIcon: ({ color, size, focused }) =>
            focused ? <AlarmClock color={color} size={size} /> : <Clock color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ color, size, focused }) =>
            focused ? <CalendarPlus color={color} size={size} /> : <Calendar color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) =>
            focused ? <UserCircle color={color} size={size} /> : <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
