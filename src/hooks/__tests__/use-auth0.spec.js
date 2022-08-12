/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import {renderHook} from '@testing-library/react-hooks';
import Auth0Provider from '../auth0-provider';
import useAuth0 from '../use-auth0';

function makeJwt(claims) {
  const header = {alg: 'RS256', typ: 'JWT'};

  const payload = {
    sub: '1',
    iss: 'https://auth0.com',
    aud: 'client123',
    name: 'Test User',
    family_name: 'User',
    picture: 'https://images/pic.png',
    ...(claims !== undefined ? {claims} : null),
  };

  // prettier-ignore
  return `${Buffer.from(JSON.stringify(header)).toString('base64')}.${Buffer.from(JSON.stringify(payload)).toString('base64')}.${Buffer.from('signature').toString('base64')}`;
}

const mockIdToken = makeJwt();
const mockClearSession = jest.fn().mockImplementation(() => Promise.resolve());

const mockCredentials = {
  idToken: mockIdToken,
  accessToken: 'ACCESS TOKEN',
};

const mockAuthorize = jest
  .fn()
  .mockImplementation(() => Promise.resolve(mockCredentials));

const wrapper = ({children}) => (
  <Auth0Provider domain="DOMAIN" clientId="CLIENT ID">
    {children}
  </Auth0Provider>
);

jest.mock('../../auth0', () => {
  return jest.fn().mockImplementation(() => ({
    webAuth: {
      authorize: mockAuthorize,
      clearSession: mockClearSession,
    },
  }));
});

describe('The useAuth0 hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defines isLoading', () => {
    const {result} = renderHook(() => useAuth0());
    expect(result.current.isLoading).toEqual(true);
  });

  it('defines error', () => {
    const {result} = renderHook(() => useAuth0());
    expect(result.current.error).toBeNull();
  });

  it('defines user', () => {
    const {result} = renderHook(() => useAuth0());
    expect(result.current.user).toBeNull();
  });

  it('defines authorize', () => {
    const {result} = renderHook(() => useAuth0());
    expect(result.current.authorize).toBeDefined();
  });

  it('defines clearSession', () => {
    const {result} = renderHook(() => useAuth0());
    expect(result.current.clearSession).toBeDefined();
  });

  it('throws an error when login is called without a wrapper', () => {
    const {result} = renderHook(() => useAuth0());

    expect(() => result.current.authorize()).toThrowError(
      /no provider was set/i,
    );
  });

  it('throws an error when logout is called without a wrapper', () => {
    const {result} = renderHook(() => useAuth0());

    expect(() => result.current.clearSession()).toThrowError(
      /no provider was set/i,
    );
  });

  it('can authorize', async () => {
    const {result, waitForNextUpdate} = renderHook(() => useAuth0(), {wrapper});
    const credentials = result.current.authorize();

    await waitForNextUpdate();
    expect(result.current.user).not.toBeNull();
    expect(credentials).resolves.toMatchObject(mockCredentials);
  });

  it('can authorize, passing through all parameters', async () => {
    const {result, waitForNextUpdate} = renderHook(() => useAuth0(), {wrapper});

    result.current.authorize({
      scope: 'custom-scope',
      audience: 'http://my-api',
      customParam: '1234',
    });

    await waitForNextUpdate();

    expect(mockAuthorize).toHaveBeenCalledWith({
      scope: 'custom-scope',
      audience: 'http://my-api',
      customParam: '1234',
    });
  });

  it('can clear the session', async () => {
    const {result, waitForNextUpdate} = renderHook(() => useAuth0(), {wrapper});

    result.current.clearSession();
    await waitForNextUpdate();
    expect(result.current.user).toBeNull();
  });

  it('can clear the session and pass parameters', async () => {
    const {result, waitForNextUpdate} = renderHook(() => useAuth0(), {wrapper});

    result.current.clearSession({parameter: 1}, {option: 1});
    await waitForNextUpdate();
    expect(mockClearSession).toHaveBeenCalledWith({parameter: 1}, {option: 1});
  });

  it('sets the error property when an error is raised in authorize', async () => {
    const {result, waitForNextUpdate} = renderHook(() => useAuth0(), {wrapper});
    const errorToThrow = new Error('Authorize error');

    mockAuthorize.mockRejectedValue(errorToThrow);

    result.current.authorize();
    await waitForNextUpdate();
    expect(result.current.error).toBe(errorToThrow);
  });

  it('clears the error on successful login', async () => {
    const {result, waitForNextUpdate} = renderHook(() => useAuth0(), {wrapper});
    const errorToThrow = new Error('Authorize error');

    mockAuthorize.mockRejectedValueOnce(errorToThrow);
    mockAuthorize.mockResolvedValue(mockCredentials);

    result.current.authorize();
    await waitForNextUpdate();
    expect(result.current.error).toBe(errorToThrow);
    result.current.authorize();
    await waitForNextUpdate();
    expect(result.current.error).toBeNull();
  });

  it('sets the error property when an error is raised in clearSession', async () => {
    const {result, waitForNextUpdate} = renderHook(() => useAuth0(), {wrapper});
    const errorToThrow = new Error('Authorize error');

    mockClearSession.mockRejectedValue(errorToThrow);

    result.current.clearSession();
    await waitForNextUpdate();
    expect(result.current.error).toBe(errorToThrow);
  });

  it('clears the error on successful logout', async () => {
    const {result, waitForNextUpdate} = renderHook(() => useAuth0(), {wrapper});
    const errorToThrow = new Error('Authorize error');

    mockClearSession.mockRejectedValueOnce(errorToThrow);
    mockClearSession.mockResolvedValue();

    result.current.clearSession();
    await waitForNextUpdate();
    expect(result.current.error).toBe(errorToThrow);
    result.current.clearSession();
    await waitForNextUpdate();
    expect(result.current.error).toBeNull();
  });
});
