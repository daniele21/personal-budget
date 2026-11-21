import assert from 'node:assert/strict';
import test from 'node:test';
import {
  readRedactedSecureGrant,
  readRedactedLiveListener,
  readRedactedPackageVersion,
} from '../diagnose-android-listener-binding.mjs';

const v2 = 'com.staituned.aura.paymentdetection.listener.AuraNotificationListenerServiceV2';

test('V2 secure grant is independent of other apps and legacy component', () => {
  assert.equal(readRedactedSecureGrant(null), null);
  assert.equal(readRedactedSecureGrant('null'), null);
  assert.equal(readRedactedSecureGrant('com.other/Example'), false);
  assert.equal(
    readRedactedSecureGrant('com.staituned.aura/.paymentdetection.listener.AuraNotificationListenerServiceV2'),
    true,
  );
  assert.equal(
    readRedactedSecureGrant('com.staituned.aura/com.staituned.aura.paymentdetection.listener.AuraNotificationListenerServiceV2'),
    true,
  );
  assert.equal(
    readRedactedSecureGrant('com.staituned.aura/com.staituned.aura.paymentdetection.listener.AuraNotificationListenerService'),
    false,
  );
});

test('live listener evidence is tri-state and strictly section-scoped', () => {
  assert.deepEqual(readRedactedLiveListener(null), {
    liveSectionAvailable: false, liveV2Mentioned: null,
  });
  assert.deepEqual(readRedactedLiveListener('no expected live section\n' + v2), {
    liveSectionAvailable: false, liveV2Mentioned: null,
  });

  assert.deepEqual(readRedactedLiveListener(
    'Live notification listeners (1):\n  ComponentInfo{com.staituned.aura/' +
    v2 + '}\nSnoozed notification listeners\n',
  ), { liveSectionAvailable: true, liveV2Mentioned: true });

  assert.deepEqual(readRedactedLiveListener(
    'Live notification listeners (0):\n' +
    'Snoozed notification listeners\n' + v2,
  ), { liveSectionAvailable: true, liveV2Mentioned: false });
});

test('raw private notification content never appears in the redacted objects', () => {
  const secret = 'PRIVATE_BANK_TEXT_DO_NOT_EMIT';
  const notificationDump =
    'NotificationRecord: ' + secret + '\n' +
    'Live notification listeners (1):\n  ComponentInfo{com.staituned.aura/' +
    v2 + '}\nSnoozed notification listeners\n' + secret;
  const packageDump =
    'versionCode=200334 minSdk=36 targetSdk=36\n' +
    'versionName=1.0.26\nPRIVATE_ACCOUNT=' + secret;
  const result = {
    ...readRedactedLiveListener(notificationDump),
    ...readRedactedPackageVersion(packageDump),
  };
  assert.equal(result.liveV2Mentioned, true);
  assert.equal(result.versionCode, 200334);
  assert.equal(result.versionName, '1.0.26');
  assert.equal(JSON.stringify(result).includes(secret), false);
});
