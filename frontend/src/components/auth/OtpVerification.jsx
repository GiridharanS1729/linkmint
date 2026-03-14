import { useRef, useState } from 'react';
import { Button } from '../ui/button';

export default function OtpVerification({ email, mode, onVerify, onResend, loading }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const refs = useRef([]);

  function updateDigit(index, value) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < 5) refs.current[index + 1]?.focus();
  }

  function onKeyDown(index, event) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  function submit(event) {
    event.preventDefault();
    onVerify({ email, mode, otp: digits.join('') });
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <p className="text-sm text-slate-300">Enter the 6-digit OTP sent to <span className="font-medium text-white">{email}</span>.</p>
      <div className="grid grid-cols-6 gap-2">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(node) => { refs.current[index] = node; }}
            value={digit}
            onChange={(event) => updateDigit(index, event.target.value)}
            onKeyDown={(event) => onKeyDown(index, event)}
            className="h-12 rounded-xl border border-white/20 bg-slate-900/50 text-center text-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
            inputMode="numeric"
            maxLength={1}
            aria-label={`OTP digit ${index + 1}`}
          />
        ))}
      </div>
      <Button className="w-full" disabled={loading || digits.join('').length !== 6}>
        {loading ? 'Verifying...' : 'Verify OTP'}
      </Button>
      <button type="button" onClick={onResend} className="w-full text-sm text-blue-300 hover:text-blue-200" disabled={loading}>
        Resend OTP
      </button>
    </form>
  );
}
