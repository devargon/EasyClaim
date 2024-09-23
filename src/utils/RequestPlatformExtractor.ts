import { Request } from 'express';
import platform from 'platform';
import { lookup } from 'geoip-lite';

export interface PlatformData {
    device: string | null;
    location: string | null;
    ipAddress: string | null;
}

export function platformExtractor(req: Request): PlatformData {
    const userAgent = req.get('User-Agent') || null;
    const ip = Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;

    let derivedLocation: string | null = null;

    if (ip) {
        const ipLookupResult = lookup(ip);
        derivedLocation = ipLookupResult ? ipLookupResult.city || null : null;
    }

    const derivedPlatform = userAgent ? platform.parse(userAgent) : null;
    const device = derivedPlatform?.description || null;

    return {
        device,
        location: derivedLocation,
        ipAddress: ip,
    };
}

function processPlatformData(data: PlatformData) {
    console.log(data.device, data.location, data.ipAddress);
}
