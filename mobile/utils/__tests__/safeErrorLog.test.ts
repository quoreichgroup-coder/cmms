// @ts-nocheck Jest globals are provided by jest-expo at test runtime.
import { getSafeErrorDetails } from '../safeErrorLog';

describe('safe error diagnostics', () => {
  it('keeps only whitelisted transport metadata from Axios-like errors', () => {
    const error = Object.assign(new Error('server detail with secret'), {
      code: 'ERR_NETWORK',
      config: { headers: { Authorization: 'Bearer secret-token' } },
      response: {
        status: 503,
        data: { message: 'internal server detail' }
      }
    });

    expect(getSafeErrorDetails(error)).toEqual({
      code: 'ERR_NETWORK',
      status: 503
    });
    expect(JSON.stringify(getSafeErrorDetails(error))).not.toContain('secret');
    expect(JSON.stringify(getSafeErrorDetails(error))).not.toContain(
      'internal server detail'
    );
  });

  it('ignores arbitrary error codes and malformed status values', () => {
    expect(
      getSafeErrorDetails({
        code: 'Bearer secret-token',
        response: { status: '500' }
      })
    ).toEqual({});
  });

  it('does not expose primitive error values', () => {
    expect(getSafeErrorDetails('Bearer secret-token')).toEqual({});
    expect(getSafeErrorDetails(null)).toEqual({});
  });
});
