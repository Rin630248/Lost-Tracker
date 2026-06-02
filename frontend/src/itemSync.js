const ITEM_SYNC_STORAGE_KEY = 'lost-found-items-updated'
const ITEM_SYNC_CHANNEL_NAME = 'lost-found-items'

export function notifyItemsChanged() {
  if (typeof window === 'undefined') {
    return
  }

  const payload = {
    timestamp: Date.now(),
  }

  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(ITEM_SYNC_CHANNEL_NAME)
      channel.postMessage(payload)
      channel.close()
    }
  } catch {
    // Ignore sync transport errors and fall back to the storage event below.
  }

  try {
    window.localStorage.setItem(ITEM_SYNC_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Ignore storage errors so regular page behavior continues.
  }
}

export function subscribeToItemChanges(onChange) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  let channel = null

  const handleStorage = (event) => {
    if (event.key === ITEM_SYNC_STORAGE_KEY && event.newValue) {
      onChange()
    }
  }

  window.addEventListener('storage', handleStorage)

  try {
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel(ITEM_SYNC_CHANNEL_NAME)
      channel.addEventListener('message', onChange)
    }
  } catch {
    channel = null
  }

  return () => {
    window.removeEventListener('storage', handleStorage)

    if (channel) {
      channel.removeEventListener('message', onChange)
      channel.close()
    }
  }
}
