import React from "react";
import api from "../../../services/api";


const DeviceRegistration = () => {
  const [loading, setLoading] = React.useState(false);
  const [qrCode, setQrcode] = React.useState<string | null>(null);
  const [key, setKey] = React.useState<string | null>(null);

  // const getPairCode = async (phoneNumber: string) => {
  //   try {
  //     setLoading(true);
  //     const response = await fetch('/instance/pairCode', {
  //       body: JSON.stringify({ phoneNumber, key }),
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': 'Bearer ' + token
  //       }
  //     })
  //     if (response.status === 200) {
  //       const data = await response.json();
  //       alert(data.code)
  //     }
  //     if (response.status === 403) {
  //       alert('Token inválido');
  //       signOut()
  //       setKey(null)
  //       localStorage.removeItem('token');
  //       return
  //     }
  //   } catch (e: unknown) {
  //     if (e instanceof DOMException && e.name === "AbortError") {
  //       console.log('Request aborted');
  //     }
  //   }
  //   finally {
  //     setLoading(false);
  //   }
  // }
  const initializeWhatsappInstance = async (key: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/instance/init?key=${key}`,
        {
          signal: AbortSignal.timeout(5000)
        }
      );
      if (response.status === 200) {
        setKey(key);
      }
      if (response.status === 403) {
        alert('Token inválido');
        setKey(null)
        localStorage.removeItem('token');
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") {
        console.log('Request aborted');
      }
    }
    finally {
      setLoading(false);
    }
  }
  const getQrBase64 = async (key: string) => {

    try {
      setLoading(true);
      const response = await api.get(`/instance/qrbase64?key=${key}`,
        {
          signal: AbortSignal.timeout(5000)
        }
      );
      if (response.status === 200) {
        const imgData = await response.data
        alert(imgData.message)
        if (!imgData.qrcode) {
          setQrcode(null);
        }
        setQrcode(imgData.qrcode);
        return
      }
      if (response.status === 403) {
        alert('Token inválido');
        setKey(null)
        localStorage.removeItem('token');
        return
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") {
        console.log('Request aborted');
      }
    }
    finally {
      setLoading(false);
    }
  }
  return (
    <React.Suspense fallback={<p>carregando...</p>}>
      <section className="p-8 border-slate-600 shadow-sm shadow-white bg-slate-100/5 w-3/6 min-h-1/2 bg-white/4">
        <h3 className="text-3xl text-center text-[#8BC1EF]">Cadastrar dispositivo</h3>
        <form onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.target as HTMLFormElement);
          const key = form.get('key') as string;
          initializeWhatsappInstance(key);
        }} className="p-4 m-4 flex flex-col gap-4">
          <label className="text-md text-[#8BC1EF]" htmlFor="key-input" id="key-label">
            Nome da instância
          </label>
          <input aria-labelledby="key-label" id="key-input" className="p-2  text-zinc-800 placeholder:text-zinc-500" type="text" name="key" placeholder="Informe um nome único para a instância" maxLength={8} />
          <div className="flex justify-end">
            <button type="submit" className="px-4 py-2 bg-[#8BC1EF] text-black font-semibold" disabled={loading}>
              {loading ? 'Carregando...' : 'Inicializar'}
            </button>
          </div>
        </form>
        {/* 
            // Removed because pairing code not working properly
            {key && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = new FormData(e.target as HTMLFormElement);
                const phoneNumber = form.get('phoneNumber') as string;
                await getPairCode(phoneNumber);
              }} className="p-4 m-4 flex flex-col gap-4">
                <input className="p-2 text-[#8BC1EF]" type="text" name="phoneNumber" placeholder="Informe o número de telefone" required />
                <div className="flex justify-center">
                  <button className="p-4 bg-[#8be8ef] text-black font-semibold" type="submit" disabled={loading}>Solicitar código</button>
                </div>
              </form>
            )} */}
        {qrCode && (
          <div className="flex justify-center my-4">
            <img src={qrCode} alt="QRCode" />
          </div>
        )}
        {key && (
          <div className="flex justify-center my-4">
            <button type="button" className="p-4 bg-[#8be8ef] text-black font-semibold" onClick={() => getQrBase64(key)}>Obter QRCode</button>
          </div>
        )}
      </section>
    </React.Suspense>
  )
}
export default DeviceRegistration
