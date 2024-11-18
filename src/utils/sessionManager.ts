// sessionManager.ts
import mysql from 'mysql2/promise';

interface Session {
    sid: string;
    userId: number;
    expires: Date;
    data: string;
    createdAt: Date;
    updatedAt: Date;
}

export class SessionManager {
    private pool: mysql.Pool;

    constructor() {
        const dbUrl = process.env.DB_SESSION_URL;
        if (!dbUrl) {
            throw new Error('DB_SESSION_URL environment variable is not set.');
        }

        this.pool = mysql.createPool(dbUrl);
    }

    /**
     * Fetch all sessions associated with a specific userId.
     * @param userId - The user ID to search for.
     * @returns A promise that resolves to an array of Session objects.
     */
    async getSessionsByUserId(userId: number): Promise<Session[]> {
        const query = `
      SELECT sid, userId, expires, data, createdAt, updatedAt
      FROM Sessions
      WHERE userId = ?;
    `;

        const [rows] = await this.pool.execute<mysql.RowDataPacket[]>(query, [userId]);

        // Map the rows to the Session interface
        const sessions: Session[] = rows.map((row) => ({
            sid: row.sid,
            userId: row.userId,
            expires: row.expires,
            data: row.data,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        }));

        return sessions;
    }

    /**
     * Delete all sessions for a user except the one with the specified session ID.
     * @param userId - The user ID whose sessions should be deleted.
     * @param sessionId - The session ID to exclude from deletion.
     * @returns A promise that resolves when the operation is complete.
     */
    async deleteSessionsByUserIdExceptSessionId(userId: number, sessionId: string): Promise<number> {
        const query = `
            DELETE FROM Sessions
            WHERE userId = ? AND sid <> ?;
        `;

        const [result]: any = await this.pool.execute(query, [userId, sessionId]);

        // Extract the number of affected rows
        return result.affectedRows;
    }

}
