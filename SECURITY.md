# Security Policy

## Supported Versions

EllyMUD is currently in active development. Security updates are provided for the latest version only.

| Version  | Supported          |
| -------- | ------------------ |
| latest   | :white_check_mark: |
| < latest | :x:                |

## Reporting a Vulnerability

The EllyMUD team takes security bugs seriously. We appreciate your efforts to responsibly disclose your findings.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities by:

1. **Opening a private security advisory** on GitHub:
   - Go to the [Security tab](https://github.com/ellyseum/ellymud/security)
   - Click "Report a vulnerability"
   - Fill in the details of the vulnerability

2. **Alternatively**, create a private issue:
   - Email the maintainers (if email is provided in the repository)
   - Include detailed information about the vulnerability

### What to Include

Please include as much of the following information as possible:

- **Type of vulnerability** (e.g., SQL injection, XSS, authentication bypass)
- **Full paths of affected source file(s)**
- **Location of the affected source code** (tag/branch/commit or direct URL)
- **Step-by-step instructions to reproduce the issue**
- **Proof-of-concept or exploit code** (if possible)
- **Impact of the vulnerability** and how an attacker might exploit it
- **Any potential mitigations** you've identified

### What to Expect

- **Acknowledgment**: We'll acknowledge receipt of your vulnerability report within 48 hours
- **Communication**: We'll keep you informed about the progress of fixing the vulnerability
- **Timeline**: We aim to patch critical vulnerabilities within 7-14 days
- **Credit**: If you'd like, we'll publicly thank you for your responsible disclosure once the issue is resolved

## Security Best Practices for Users

When running EllyMUD, follow these security best practices:

### 1. Password Security

- Use strong passwords for admin accounts
- Change default passwords immediately after first setup
- Store passwords securely using the built-in hashing and salting mechanisms
- Enable the password attempt limit (default: 3 attempts) in `.env`

### 2. Network Security

- **Don't expose directly to the internet** without proper security measures
- Use a firewall to restrict access to Telnet (port 8023) and HTTP/WebSocket (port 8080) ports
- Consider using a reverse proxy (nginx, Apache) for the web interface
- Use HTTPS/TLS if exposing the web interface publicly
- Consider using SSH tunneling for Telnet connections

### 3. Configuration Security

- Review `.env` settings before production use
- Don't commit `.env` files to version control (already in `.gitignore`)
- Restrict file permissions on data files and logs:
  ```bash
  chmod 600 .env
  chmod 700 data/
  chmod 700 logs/
  ```

### 4. User Input Validation

- All user input is validated before processing
- Command arguments are sanitized to prevent injection attacks
- Be cautious when adding custom commands that handle user input

### 5. Regular Updates

- Keep Node.js and npm updated to the latest stable versions
- Run `npm audit` regularly to check for vulnerable dependencies:
  ```bash
  npm audit
  npm audit fix
  ```
- Update EllyMUD to the latest version when security patches are released

### 6. Logging and Monitoring

- Regularly review logs in the `/logs` directory
- Monitor for suspicious activity:
  - Multiple failed login attempts
  - Unusual command patterns
  - Unexpected errors or exceptions
- Enable audit logging for sensitive operations

### 7. Admin Access

- Limit admin access to trusted users only
- Use admin commands responsibly
- Don't share admin credentials
- Consider using `--forceSession` only in development environments

### 8. Data Backup

- Regularly backup the `data/` directory
- Store backups securely and separately from the main server
- Test backup restoration procedures

## Known Security Considerations

### Current Limitations

1. **Telnet Protocol**: Telnet transmits data in plaintext. For sensitive environments:
   - Use SSH tunneling
   - Consider implementing TLS support for Telnet
   - Restrict Telnet to localhost or trusted networks

2. **WebSocket Authentication**: Ensure proper authentication is maintained for WebSocket connections

3. **Session Management**: Sessions are stored in memory. Server restart will clear active sessions

4. **Rate Limiting**: Consider implementing rate limiting for:
   - Login attempts (partially implemented)
   - Command execution
   - API endpoints

### Future Security Enhancements

We're working on:

- [ ] Optional TLS/SSL support for all connections
- [ ] Two-factor authentication (2FA) for admin accounts
- [ ] Enhanced rate limiting
- [ ] More granular permission system
- [ ] Security audit logging
- [ ] Content Security Policy (CSP) for web client

## Security Features

EllyMUD includes several built-in security features:

### 1. Password Security

- Passwords are salted and hashed using industry-standard algorithms
- Password attempt limits prevent brute force attacks
- No passwords are logged or displayed

### 2. Input Sanitization

- User input is validated against expected patterns
- Command parsing includes injection prevention
- File paths are validated to prevent directory traversal

### 3. Role-Based Access Control (RBAC)

- Clear separation between user and admin privileges
- Admin commands require proper authorization
- User actions are logged for audit trails

### 4. Session Management

- Secure session handling
- Session timeout mechanisms
- Prevention of session hijacking

### 5. Logging

- Comprehensive logging of user actions
- Separate logs for different event types
- Daily log rotation to manage disk space

## Vulnerability Disclosure Policy

We follow a coordinated vulnerability disclosure policy:

1. **Reporter submits** vulnerability details privately
2. **We acknowledge** receipt within 48 hours
3. **We investigate** and develop a fix
4. **We notify** the reporter when the fix is ready
5. **We release** the patched version
6. **We publish** a security advisory with credit to the reporter (if desired)
7. **Reporter may publish** their findings after the advisory is public

## Security Hall of Fame

We appreciate researchers who help improve EllyMUD's security:

<!-- Contributors who report security issues will be listed here -->

_No security issues have been reported yet._

## Additional Resources

- [OWASP Top Ten](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)

## Contact

For security-related questions that aren't vulnerabilities, please open a regular issue on GitHub.

---

Thank you for helping keep EllyMUD and its users safe! 🔒
