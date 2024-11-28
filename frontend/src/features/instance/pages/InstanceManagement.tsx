import React from "react";
import api from "../../../services/api";
import { PersonIcon, TrashIcon } from "@radix-ui/react-icons";
import { useNavigate } from "react-router";
type Instance = {
  instance_key: string,
  phone_connected?: boolean,
  user: {
    id?: string,
    lid?: string,
    name?: string
  }
}
type ListInstanceResponse = {
  data?: Instance[]
  message: string,
  error?: string
}
const InstanceManagement = () => {
  const [instances, setInstances] = React.useState<string[]>([]);
  React.useEffect(() => {
    const fetchInstances = async () => {
      try {
        const response = await api.get(`/instance/list`,
          {
            signal: AbortSignal.timeout(5000)
          }
        );
        if (response.status === 200) {
          const json = await response.data as unknown as ListInstanceResponse
          if (json.data && json.data.length >= 0) {
            const loadedInstances: string[] = []
            json.data.forEach(instance => {
              if (instance.phone_connected) {
                loadedInstances.push(instance.instance_key)
              }
            })
            setInstances(loadedInstances)
          }
        }
        if (response.status === 403) {
          alert('Token inválido');
          localStorage.removeItem('token');
        }
      } catch (error) {
        alert(error)
      }
    }
    fetchInstances()

  }, [])
  const restoreInstances: React.MouseEventHandler<HTMLButtonElement> = async () => {
    try {
      const response = await api.get('/instance/restore')
      if (response.status === 200) {
        const json = await response.data
        alert(json.message)
        setInstances(json.data);
      }
      if (response.status === 403) {
        alert('token inválido')
      }
    } catch (error) {
      alert(error)
    }
  }
  const deleteInstance = async (key: string) => {
    api.delete(`/instance/delete?key=${key}`)
      .then(response => {
        if (response.status === 200) {
          const json = response.data
          alert(json.message)
          setInstances(instances.filter(instance => instance !== key));
        }
        if (response.status === 403) {
          alert('Token inválido');
          localStorage.removeItem('token');
          return
        }
      })
  }
  const navigate = useNavigate();

  return (
    <React.Suspense fallback={<p>Carregando...</p>}>
      <div className="p-8 border-slate-600 shadow-sm shadow-white w-3/6 bg-slate-100/5 flex gap-4 flex-col items-center justify-center">
        {instances && instances.length > 0
          ? (
            <>
              <h3 className="text-3xl text-center text-primary-300"> Instâncias rodando</h3>
              <ul className="flex flex-col gap-4">
                {instances.map((instance) => (
                  <li key={instance} className="flex justify-between gap-2">
                    <span>{instance}</span>
                    <button
                      type="button"
                      onClick={() => deleteInstance(instance)}
                      className="px-2 bg-red-500 text-black text-sm flex items-center rounded-md opacity-90 hover:opacity-80 active:opacity-100"
                    >
                      <TrashIcon />
                      <span className="sr-only"> Remover instância</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigate(`/groups/${instance}`)
                      }}
                      className="px-2 bg-primary-300 text-black text-sm flex items-center rounded-md opacity-90 hover:opacity-80 active:opacity-100"
                    >
                      <PersonIcon />
                      <span className=""> Ver grupos</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )
          : (
            <>
              <p className="text-lg text-center font-normal"> Nenhuma instância rodando no momento.<br />
              </p>
            </>
          )
        }
        <button type="button" onClick={restoreInstances} className="p-4 bg-[#8be8ef] text-black font-semibold">
          Iniciar instâncias cadastradas
        </button>
      </div>
    </React.Suspense>
  )
}
export default InstanceManagement
