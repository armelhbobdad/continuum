# Deep Link Setup for OAuth (Story 5.3)

This document describes the platform-specific setup required for the `continuum://` deep link protocol used in OAuth authentication flows.

## Overview

The OAuth flow uses deep links to receive the authorization callback from the OAuth provider. The protocol `continuum://callback` allows the browser to redirect back to the Continuum app after authentication.

## Configuration Files

### tauri.conf.json

The deep link scheme is registered in `tauri.conf.json`:

```json
{
  "plugins": {
    "deep-link": {
      "mobile": [],
      "desktop": {
        "schemes": ["continuum"]
      }
    }
  }
}
```

## Platform-Specific Details

### macOS

On macOS, Tauri automatically updates the `Info.plist` during the build process to include:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>continuum</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>continuum</string>
    </array>
  </dict>
</array>
```

**Manual verification:** After building, you can verify by checking:
```bash
/path/to/Continuum.app/Contents/Info.plist
```

### Windows

On Windows, Tauri registers the protocol handler in the Windows Registry:

```
HKEY_CURRENT_USER\Software\Classes\continuum
  (Default) = "URL:Continuum Protocol"
  URL Protocol = ""

HKEY_CURRENT_USER\Software\Classes\continuum\shell\open\command
  (Default) = "C:\path\to\Continuum.exe" "%1"
```

**Note:** Registration happens automatically during app installation via the Tauri installer.

### Linux

On Linux, Tauri creates a `.desktop` file with the URL handler:

```desktop
[Desktop Entry]
Name=Continuum
Exec=/path/to/continuum %U
Type=Application
MimeType=x-scheme-handler/continuum;
```

The file is typically placed at:
- `~/.local/share/applications/continuum.desktop`

**Registration command:**
```bash
xdg-mime default continuum.desktop x-scheme-handler/continuum
```

## Testing Deep Links

### Development

During development, you can test deep links using:

**macOS:**
```bash
open "continuum://callback?code=test123&state=abc"
```

**Windows (PowerShell):**
```powershell
Start-Process "continuum://callback?code=test123&state=abc"
```

**Linux:**
```bash
xdg-open "continuum://callback?code=test123&state=abc"
```

### Production

In production, the OAuth provider redirects to:
```
continuum://callback?code=<auth_code>&state=<state_token>
```

The deep link plugin captures this and routes it to the registered handler in Rust.

## Security Considerations

1. **State Validation**: Always validate the `state` parameter matches what was generated when starting the OAuth flow (ADR-CRED-2 injection prevention).

2. **Code Expiry**: Authorization codes are typically single-use and expire quickly (usually 10 minutes).

3. **PKCE**: Always use PKCE (Proof Key for Code Exchange) to prevent authorization code interception attacks.

## Troubleshooting

### Deep link not working

1. **Rebuild the app** after changing `tauri.conf.json`
2. **Reinstall the app** to update protocol handlers
3. **Check registration:**
   - macOS: `defaults read /path/to/Continuum.app/Contents/Info.plist CFBundleURLTypes`
   - Windows: Check registry at `HKEY_CURRENT_USER\Software\Classes\continuum`
   - Linux: `xdg-mime query default x-scheme-handler/continuum`

### Fallback to Local Server

If deep links fail, the OAuth flow automatically falls back to a local HTTP server (see Story 5.3 AC2).

## References

- [Tauri Deep Link Plugin](https://v2.tauri.app/plugin/deep-link/)
- [RFC 7636 - PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [OAuth 2.0 for Native Apps](https://www.rfc-editor.org/rfc/rfc8252)
