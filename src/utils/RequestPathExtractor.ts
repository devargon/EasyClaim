import { Request } from 'express';

export function pathExtractor(req: Request) {
    function escapeRegExp(str: string): string {
        return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
    }

    function replaceAll(str: string, find: string, replace: string): string {
        return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
    }

    return replaceAll(req.get('referer') || '', req.get('origin') || '', '');
}
