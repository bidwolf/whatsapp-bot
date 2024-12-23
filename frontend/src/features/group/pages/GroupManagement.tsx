import React from 'react';
import api from '../../../services/api';
import { useNavigate, useParams } from 'react-router';
import { ExclamationTriangleIcon, GearIcon, LockClosedIcon, PersonIcon, TrashIcon } from '@radix-ui/react-icons';
import { AxiosError } from 'axios';
import { useAuth } from '../../auth/hooks/useAuth';
type Participant = {
  id: string;
  admin: 'admin' | 'superadmin' | null
}
type Group = {
  allowOffenses: boolean;
  blackListedUsers: string[];
  blockedCommands: string[];
  groupId: string;
  name: string;
  participants: Participant[];
}
type FetchGroupsResponse = {
  error: boolean;
  data: Group[];
  message?: string;
}
const MainPanel: React.FC = () => {
  const params = useParams<{ instanceKey: string }>()
  const [groups, setGroups] = React.useState<Group[]>([])
  const navigate = useNavigate();
  const { signOut } = useAuth()
  const deleteGroup = async (groupId: string) => {
    try {
      const response = await api.post(`/group/unregister?key=${params.instanceKey}`, {
        id: groupId
      })
      if (response.status === 200) {
        const updatedGroups = groups.filter(g => g.groupId === groupId)
        setGroups(updatedGroups)
        alert('Grupo deletado com sucesso.')
      }
      if (response.status === 404) {
        alert(response.data.message)
        navigate('/')
      }
    } catch (e) {
      if (e instanceof AxiosError) {
        if (e.status === 401) {
          alert('Sua sessão expirou');
          signOut()
          navigate('/login')
        }
        alert(e.response?.data.message)
        navigate('/')
        return
      }
      console.error(e)
    }
  }
  React.useEffect(() => {
    const fetchGroups = async () => {
      try {

        const response = await api.get(`/group/availableGroups?key=${params.instanceKey}`)
        if (response.status === 200) {
          const payload: FetchGroupsResponse = response.data
          setGroups(payload.data)
        }
        if (response.status === 404) {
          alert(response.data.message)
          navigate('/')
        }
      } catch (e) {
        if (e instanceof AxiosError) {
          if (e.status === 401) {
            alert('Sua sessão expirou');
            signOut()
            navigate('/login')
          }
          alert(e.response?.data.message)
          navigate('/')
          return
        }
        console.error(e)
      }
    }
    fetchGroups()
  }, [params.instanceKey, navigate, signOut])
  return (
    <React.Suspense fallback={<p>...carregando</p>}>
      <div>
        {groups?.length > 0 ? (
          <>
            <h2 className='text-2xl font-medium text-primary-300 text-center'>Gerenciar Grupos</h2>

            <div className='flex flex-col gap-4 md:grid md:grid-cols-2 lg:grid-cols-3 my-8'>
              {
                groups.map((group) => (
                  <div key={group.groupId} className='bg-primary-50/5 p-8 flex flex-col gap-4'>
                    <div className='flex gap-2 items-center justify-between'>
                      <h3 className='text-xl text-center font-medium capitalize'>{group.name}</h3>
                      <button
                        onClick={async () => {
                          await deleteGroup(group.groupId)

                        }}
                        type='button'
                        className='bg-red-600 p-2 rounded-md transition opacity-80 hover:opacity-90 active:opacity-100 active:bg-red-700'>
                        <span className='sr-only'>Excluir grupo</span>
                        <TrashIcon />
                      </button>
                    </div>
                    <p className='flex gap-2 items-center'><ExclamationTriangleIcon className='text-primary-300' />Ofensas {group.allowOffenses ? "Habilitadas" : "Desabilitadas"}</p>
                    <p className='flex gap-2 items-center'><PersonIcon className='text-primary-300' />{group?.participants?.length} Usuários</p>
                    <p className='flex gap-2 items-center'><GearIcon className='text-primary-300' />{group?.blockedCommands?.length > 0 ? `${group.blockedCommands.length} Comandos bloqueados` : 'Nenhum comando bloqueado'}</p>
                    <p className='flex gap-2 items-center'><LockClosedIcon className='text-primary-300' />{group?.blackListedUsers?.length > 0 ? `${group.blackListedUsers.length} Usuários bloqueados` : 'Nenhum usuário bloqueado'}</p>

                  </div>
                ))
              }
            </div>
          </>
        ) : (
          <div className='flex flex-col gap-4'>
            <h3 className='text-xl text-primary-300 text-center font-medium'> Nenhum Grupo Cadastrado</h3>
            <p className='text-lg text-center'>
              Parece que você ainda não registrou nenhum grupo para essa instância.
            </p>
          </div>
        )}
        <button
          type="button"
          className='bg-primary-300 w-fit min-w-96 fixed bottom-4 left-1/2 right-1/2 md:relative -translate-x-1/2 px-4 py-2 rounded-md text-zinc-900 font-semibold transition-opacity opacity-80 hover:opacity-90 active:opacity-100'
          onClick={() => {
            navigate(`/groups/${params.instanceKey}/register`)
          }}
        >
          Cadastrar grupo
        </button>
      </div>
    </React.Suspense>
  );
};

export default MainPanel;
