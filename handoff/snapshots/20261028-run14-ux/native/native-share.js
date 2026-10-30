// Native shell only (Capacitor Android). Not part of the web app. Wires the real plugins into native-share-core.js.
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { makeNativeShare } from './native-share-core.js'

if (Capacitor.isNativePlatform()) {
  window.__ledgerNativeShare = makeNativeShare({ Filesystem, Directory, Encoding, Share })
}
