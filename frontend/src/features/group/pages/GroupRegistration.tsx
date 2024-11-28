import React, { FormEventHandler } from 'react'
import { useNavigate, useParams } from 'react-router'
import api from '../../../services/api'
import { AxiosError } from 'axios';
import { useAuth } from '../../auth/hooks/useAuth';
import Select from '../../../components/Select';
type GroupData = {
  subject: string;
  size: number;
  isCommunity: boolean;
  id: string;
}
type InstanceData = {
  [groupId: string]: GroupData
}
type FetchAvailableGroupsResponse = {
  error: boolean,
  message: string,
  instance_data: InstanceData
}
const GroupRegistration = () => {
  const params = useParams<{ instanceKey: string }>()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [availableGroups, setAvailableGroups] = React.useState<GroupData[]>([])
  const [isSubmitting, setLoading] = React.useState(false)
  React.useEffect(() => {
    const fetchAvailableGroups = async () => {
      try {
        const response = await api.get(`/group/getallgroups?key=${params.instanceKey}`)
        if (response.status === 200) {
          const allData: FetchAvailableGroupsResponse = response.data
          const groups: GroupData[] = Object.values(allData.instance_data).filter(d => !d.isCommunity)
          setAvailableGroups(groups)
        }
      } catch (error) {
        if (error instanceof AxiosError) {
          if (error.status === 401) {
            alert('Sua sessão expirou');
            signOut()
            navigate('/login')
          }
        }
      }
    }
    fetchAvailableGroups()
  }, [navigate, params.instanceKey, signOut])
  const registerGroup = React.useCallback(async (id: string) => {
    try {
      const response = await api.post(`/group/register?key=${params.instanceKey}`, { id })
      if (response.status === 200) {
        alert(response.data.message)
        navigate(`/groups/${params.instanceKey}`)
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.status === 401) {
          alert('Sua sessão expirou');
          signOut()
          navigate('/login')
          return
        }
        alert(error.response?.data.message)
      }
    }

  }, [navigate, params.instanceKey, signOut])
  const onSubmit: FormEventHandler<HTMLFormElement> = React.useCallback(async (e) => {
    setLoading(true)
    e.preventDefault()
    const data = new FormData(e.target as HTMLFormElement)
    const groupId = data.get('selected-group')
    if (!groupId) {
      alert('Não foi possível encontrar o grupo especificado. Tente novamente mais tarde')
      return
    }
    console.log(groupId)
    setLoading(false)
    await registerGroup(groupId.toString())
  }, [registerGroup])
  return (
    <div className='flex items-center justify-center h-full'>
      <form className='flex flex-col gap-4 container size-fit' onSubmit={onSubmit}>
        <h2 className='text-2xl text-primary-300 '> Registre um novo grupo para seu BOT</h2>
        <p className='text-xs text-zinc-400'>
          Os grupos registrados são compartilhados entre as instâncias.<br />
          Diferentes instâncias no mesmo grupo irão processar as mensagens em paralelo.
        </p>
        {availableGroups.length > 0 ? (
          <Select
            options={availableGroups}
            getOptionLabel={g => `${g.subject}: ${g.size} participantes`}
            label='Selecione um grupo para registrar'
            name='selected-group'
            getOptionValue={g => g.id}
            id='group-select-id'
          />
        ) : (
          <p>Este número não possui nenhum grupo criado.</p>
        )}

        {/* <select required name='selected-group' id='group-select-id'>
          {availableGroups.map(g => (
            <option key={g.id} value={g.id}>
              {g.subject}{": "}{g.size} participantes
            </option>
          ))}
        </select> */}
        <button type="submit" className="px-4 py-2 bg-[#8BC1EF] text-black font-semibold" disabled={isSubmitting}>
          {isSubmitting ? 'Carregando...' : 'Registrar Grupo'}
        </button>
      </form>
    </div>
  )
}

export default GroupRegistration
