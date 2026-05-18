export function pickFile(accept: string): Promise<File | null> {
  return new Promise<File | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.opacity = '0';
    let settled = false;

    const finish = (file: File | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      window.removeEventListener('focus', onFocus);
      resolve(file);
    };

    const onFocus = () => {
      // If the user closed the dialog without selecting, no change event fires.
      // Defer slightly to let change fire first if it is going to.
      setTimeout(() => finish(input.files && input.files[0] ? input.files[0] : null), 400);
    };

    input.addEventListener('change', () => {
      const file = input.files && input.files[0] ? input.files[0] : null;
      finish(file);
    });

    window.addEventListener('focus', onFocus, { once: true });
    document.body.appendChild(input);
    input.click();
  });
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
