import { Platform } from 'react-native';
import MapView from 'react-native-maps';

// For web platform, we'll use a placeholder component
const WebMap = () => {
  return null; // Or you could return a web-specific map implementation
};

// For native platforms, we'll use react-native-maps
const NativeMap = MapView;

// Export the appropriate component based on platform
const Map = Platform.OS === 'web' ? WebMap : NativeMap;

export default Map; 