import React from 'react';
import { useNavigate } from 'react-router';

type QrCodeDialogProps = {
  src: string;
  onClose: () => void;
};

const QRCodeDialog: React.FC<QrCodeDialogProps> = ({ src, onClose }) => {
  const navigate = useNavigate();

  const handleRead = () => {
    navigate('/');
  };

  return (
    <div className="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-gray-900/75 transition-opacity" aria-hidden="true"></div>

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="relative transform overflow-hidden rounded-lg bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
            <div className="bg-gray-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <h3 className="text-base font-semibold text-white" id="modal-title">Leia o QrCode abaixo</h3>
                  <div className="flex justify-center my-4">
                    <img src={src} alt="QRCode" />
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-400">Ler esse Qr code registra uma instância do Whatsapp na sua conta</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="button"
                className="inline-flex w-full justify-center rounded-md bg-primary-300 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 sm:ml-3 sm:w-auto"
                onClick={handleRead}
              >
                Já li
              </button>
              <button
                type="button"
                className="mt-3 inline-flex w-full justify-center rounded-md bg-gray-600 px-3 py-2 text-sm font-semibold text-gray-200 shadow-sm hover:bg-gray-500 sm:mt-0 sm:w-auto"
                onClick={onClose}
              >
                Deixa pra lá
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeDialog;
