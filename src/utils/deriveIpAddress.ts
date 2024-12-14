import { Request } from 'express';

/**
 * Parses IPv4 and IPv6 addresses from a request object.
 *
 * @param {object} req - The request object (e.g., Express.js `req`).
 * @returns {object} An object containing the parsed IPv6 and IPv4 addresses.
 */
export function parseIpAddresses(req: Request) {
    const ipAddressRaw = req.get('x-forwarded-for') || req.socket.remoteAddress || req.ip || null;

    let ipv6 = null;
    let ipv4 = null;

    if (ipAddressRaw) {
        // Split by commas and trim whitespace
        const ipAddresses = ipAddressRaw.split(',').map(ip => ip.trim());

        // Regex patterns for IPv6 and IPv4
        const ipv6Pattern = /^[a-fA-F0-9:]+$/; // Matches valid IPv6 addresses
        const ipv4Pattern = /^(?:\d{1,3}\.){3}\d{1,3}$/; // Matches valid IPv4 addresses

        // Iterate over addresses and classify as IPv6 or IPv4
        for (const ip of ipAddresses) {
            if (ip === '::1') {
                ipv6 = '::1'; // Handle IPv6 localhost explicitly
            } else if (ip === '127.0.0.1') {
                ipv4 = '127.0.0.1'; // Handle IPv4 localhost explicitly
            } else if (ipv6Pattern.test(ip) && !ipv6) {
                ipv6 = ip; // First valid IPv6 address
            } else if (ipv4Pattern.test(ip) && !ipv4) {
                ipv4 = ip; // First valid IPv4 address
            }
            // Break early if both are found
            if (ipv6 && ipv4) break;
        }
    }

    return [ ipv6, ipv4 ];
}
