import React, { useState } from 'react'
import { CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons'

type SelectProps<T> = React.ComponentProps<'input'> & {
  options: T[]
  getOptionLabel: (option: T) => string
  getOptionValue: (option: T) => string
  label: string;
  name: string
}

export default function Select<T>({ name, label, getOptionValue, getOptionLabel, options, ...inputProps }: SelectProps<T>) {
  const [selected, setSelected] = useState(options[0])
  const [isOpen, setIsOpen] = useState(false)

  const handleSelect = (option: T) => {
    setSelected(option)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-100">{label}</label>
      <div className="relative mt-2">
        <button type='button'
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-full cursor-default rounded-md bg-gray-800 py-1.5 pl-3 pr-10 text-left text-gray-100 shadow-sm ring-1 ring-inset ring-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-300 sm:text-sm"
        >
          <span className="flex items-center">
            <span className="ml-3 block truncate">{getOptionLabel(selected)}</span>
            <input type='hidden' name={name} value={getOptionValue(selected)} {...inputProps} />
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 ml-3 flex items-center pr-2">
            <ChevronDownIcon aria-hidden="true" className="size-5 text-gray-500" />
          </span>
        </button>

        {isOpen && (
          <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-gray-800 py-1 text-base shadow-lg ring-1 ring-white/10 focus:outline-none sm:text-sm">
            {options.map((option, index) => (
              <li
                key={index}
                onClick={() => handleSelect(option)}
                className="group relative cursor-default select-none py-2 pl-3 pr-9 text-gray-100 hover:bg-primary-700 hover:text-white"
              >
                <div className="flex items-center">
                  <span className="ml-3 block truncate font-normal group-hover:font-semibold">
                    {getOptionLabel(option)}
                  </span>
                </div>

                {selected === option && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-primary-500 group-hover:text-white">
                    <CheckIcon aria-hidden="true" className="size-5" />
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
