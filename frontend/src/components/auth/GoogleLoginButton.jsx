import { GoogleLogin } from '@react-oauth/google';

export default function GoogleLoginButton({ onSuccess, onError }) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-white/20 bg-white/90 p-0.5">
      <GoogleLogin
        theme="outline"
        size="large"
        text="continue_with"
        width="100%"
        onSuccess={(credentialResponse) => {
          if (credentialResponse.credential) onSuccess(credentialResponse.credential);
          else onError?.('Google credential not provided');
        }}
        onError={() => onError?.('Google login failed')}
      />
    </div>
  );
}
