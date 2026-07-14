import AsyncStorage from '@react-native-async-storage/async-storage';

const DISTINCT_ID_KEY = 'notificationService.distinct_id';

/** RFC4122 v4 UUID using Math.random (sufficient for a demo distinct_id). */
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Returns a stable distinct_id for this install, creating and persisting a new
 * UUID in AsyncStorage the first time it is requested.
 */
export async function getOrCreateDistinctId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DISTINCT_ID_KEY);
  if (existing) return existing;
  const id = uuidv4();
  await AsyncStorage.setItem(DISTINCT_ID_KEY, id);
  return id;
}
