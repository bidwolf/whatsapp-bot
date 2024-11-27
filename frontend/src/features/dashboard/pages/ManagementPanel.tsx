import React from "react";
import api from "../../../services/api";
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
const ManagementPanel = () => {
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
  return (
    <React.Suspense fallback={<p>Carregando...</p>}>
      <section className="p-8 border-slate-600 shadow-sm shadow-white w-3/6 bg-slate-100/5 flex gap-4 flex-col items-center justify-center">
        {instances && instances.length > 0
          ? (
            <>
              <h3 className="text-3xl text-center text-[#8BC1EF]"> Instâncias rodando</h3>
              <ul className="flex flex-col gap-4">
                {instances.map((instance) => (
                  <li key={instance} className="flex justify-between gap-2">
                    <span>{instance}</span>
                    <button
                      type="button"
                      onClick={() => deleteInstance(instance)}
                      className="px-2 bg-red-500 text-black text-sm"
                    >
                      Deletar instancia
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
      </section>
    </React.Suspense>
  )
}
export default ManagementPanel
