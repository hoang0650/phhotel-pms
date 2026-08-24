const {
  withAndroidManifest,
  AndroidConfig,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const NETWORK_SECURITY_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
      <certificates src="user" />
    </trust-anchors>
  </base-config>
  <domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="true">phhotel.vn</domain>
    <domain includeSubdomains="true">phgrouptechs.com</domain>
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </domain-config>
</network-security-config>
`;

function withOpenClawNetworkSecurity(config) {
  return withAndroidManifest(config, async (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const xmlDir = path.join(
      projectRoot,
      'android',
      'app',
      'src',
      'main',
      'res',
      'xml'
    );
    fs.mkdirSync(xmlDir, { recursive: true });
    const xmlPath = path.join(xmlDir, 'network_security_config.xml');
    fs.writeFileSync(xmlPath, NETWORK_SECURITY_XML, 'utf8');

    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    mainApplication.$['android:networkSecurityConfig'] = '@xml/network_security_config';

    return config;
  });
}

module.exports = withOpenClawNetworkSecurity;
