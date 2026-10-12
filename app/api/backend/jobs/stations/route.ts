import { NextRequest, NextResponse } from 'next/server';
import http from '@/lib/http';
import { JOBS_ENDPOINTS } from '@/services/jobs/endpoints';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let jobIds: string[];

  try {
    const body: unknown = await request.json();
    if (
      !body ||
      typeof body !== 'object' ||
      !('jobIds' in body) ||
      !Array.isArray(body.jobIds) ||
      !body.jobIds.every((id) => typeof id === 'string')
    ) {
      return NextResponse.json({ message: 'jobIds must be an array of strings' }, { status: 400 });
    }
    jobIds = [...new Set(body.jobIds)].sort();
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  if (jobIds.length === 0) {
    return NextResponse.json({ success: true, data: { stations: [] } });
  }

  try {
    const headers: Record<string, string> = {};
    const cookie = request.headers.get('cookie');
    const authorization = request.headers.get('authorization');
    if (cookie) headers.Cookie = cookie;
    if (authorization) headers.Authorization = authorization;

    const { data } = await http.request({
      method: 'QUERY',
      url: JOBS_ENDPOINTS.STATIONS,
      headers,
      params: { jobIds: jobIds.join(',') },
    });

    return NextResponse.json(data);
  } catch (error) {
    const status =
      typeof error === 'object' && error !== null && 'response' in error
        ? Number((error as { response?: { status?: number } }).response?.status) || 502
        : 502;
    const message = error instanceof Error ? error.message : 'Backend request failed';
    return NextResponse.json({ message }, { status });
  }
}
