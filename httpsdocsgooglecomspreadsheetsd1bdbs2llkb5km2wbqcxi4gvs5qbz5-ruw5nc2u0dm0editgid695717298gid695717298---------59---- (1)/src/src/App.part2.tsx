 return
    }

    const quantity = Number(movementForm.quantity)
    if (!quantity) {
      setNotice('Укажите количество.')
      return
    }

    const normalizedPurpose = movementForm.purpose.trim() || 'Корректировка'

    const payload: Movement = {
      id: editingMovement?.id ?? uid(),
      date: movementForm.date,
      type: movementForm.type,
      productId: movementForm.productId,
      quantity,
      vehicleId: movementForm.vehicleId || undefined,
      counterparty: movementForm.counterparty.trim(),
      documentNo: movementForm.documentNo.trim(),
      purpose: normalizedPurpose,
      note: movementForm.note.trim(),
      runHours: movementForm.runHours.trim(),
      unitPrice: undefined,
      createdAt: editingMovement?.createdAt ?? new Date().toISOString(),
    }

    setMovements((current) => {
      if (editingMovement) {
        const updated = current.map((item) => (item.id === editingMovement.id ? payload : item))
        return updated.sort(compareMovementOrderDesc)
      }
      return [payload, ...current].sort(compareMovementOrderDesc)
    })
    setMovementDateFilter(payload.date)
    setMovementSortOrder('desc')
    setEditingMovementId(null)
    const fallbackProductId = availableProductsForOutflow[0]?.id ?? products[0]?.id ?? ''
    setMovementForm(emptyMovementDraft(fallbackProductId))
    setIssueLines([emptyIssueLine(fallbackProductId)])
    setIsMovementFormOpen(false)
    setNotice(editingMovement ? `Операция обновлена за ${payload.date}.` : `Операция сохранена и показана за ${payload.date}.`)
  }

  function buildBackupPayload() {
    return {
      vehicles,
      products,
      movements,
      contacts,
      planningDays,
      registryCases,
      inspectionRecords,
      exportedAt: new Date().toISOString(),
    }
  }

  function exportBackup() {
    const payload = buildBackupPayload()
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `oil-accounting-backup-${today()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function copyShareLink() {
    const payload = {
      vehicles,
      products,
      movements,
      planningDays,
      registryCases,
      inspectionRecords,
      exportedAt: new Date().toISOString(),
    }

    try {
      const encoded = encodeBase64Url(JSON.stringify(payload))
      const shareUrl = `${window.location.origin}${window.location.pathname}#data=${encoded}`

      if (shareUrl.length > 180000) {
        setNotice('Ссылка слишком длинная для надежной передачи. Используйте Экспорт/Импорт JSON.')
        return
      }

      await navigator.clipboard.writeText(shareUrl)
      setNotice('Ссылка с данными скопирована. Откройте ее на другом компьютере.')
    } catch {
      setNotice('Не удалось скопировать ссылку. Используйте Экспорт/Импорт JSON.')
    }
  }

  function importBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        if (Array.isArray(parsed.vehicles)) setVehicles(sanitizeVehiclesNotes(parsed.vehicles))
        if (Array.isArray(parsed.products)) setProducts(parsed.products)
        if (Array.isArray(parsed.movements)) setMovements(parsed.movements)
        if (Array.isArray(parsed.contacts)) setContacts(parsed.contacts)
        if (typeof parsed.planningDays === 'number') setPlanningDays(parsed.planningDays)
        if (Array.isArray(parsed.registryCases)) setRegistryCases(parsed.registryCases)
        if (Array.isArray(parsed.inspectionRecords)) setInspectionRecords(parsed.inspectionRecords)
        setNotice('Резервная копия загружена.')
      } catch {
        setNotice('Не удалось прочитать файл резервной копии.')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  return (
    <div className="app-shell min-h-screen bg-[linear-gradient(180deg,#f9fcff_0%,#edf6ff_35%,#f8fbff_100%)] text-slate-800">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-7rem] top-[-7rem] h-72 w-72 rounded-full bg-sky-200/35 blur-3xl" />
        <div className="absolute right-[-4rem] top-16 h-96 w-96 rounded-full bg-blue-100/50 blur-3xl" />
        <div className="absolute bottom-[-7rem] left-1/3 h-80 w-80 rounded-full bg-cyan-100/35 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className={glass('sticky top-4 z-20 px-5 py-5')}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">ПаркКонтроль 360</h1>
              <p className="mt-1 text-sm text-slate-600">Система контроля автопарка: техника, масла, запчасти, движения и диагностика.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={exportBackup} className="rounded-2xl bg-sky-500/90 px-4 py-2 text-sm font-medium text-white shadow-[0_12px_30px_rgba(59,130,246,0.24)] transition hover:-translate-y-0.5 hover:bg-sky-600/90">Экспорт</button>
              <button onClick={copyShareLink} className="rounded-2xl border border-sky-200/70 bg-white/70 px-4 py-2 text-sm font-medium text-sky-700 shadow-sm backdrop-blur-2xl transition hover:bg-white/90">Скопировать ссылку с данными</button>
              <label className="rounded-2xl border border-sky-200/70 bg-sky-50/55 px-4 py-2 text-sm font-medium text-sky-700 shadow-sm backdrop-blur-2xl transition hover:bg-sky-100/65">
                Импорт
                <input type="file" accept="application/json" className="hidden" onChange={importBackup} />
              </label>
            </div>
          </div>

          {notice ? <div className="mt-4 rounded-2xl border border-white/55 bg-white/42 px-4 py-3 text-sm text-slate-700 shadow-sm backdrop-blur-2xl">{notice}</div> : null}

          <nav className="mt-4 flex flex-wrap gap-2">
            {[
              ['dashboard', 'Обзор'],
              ['vehicles', 'Техника'],
              ['products', 'Номенклатура'],
              ['directory', 'Справочник'],
              ['parts', 'Запчасти'],
              ['movements', 'Движение'],
              ['analytics', 'Аналитика'],
              ['registries', 'Ремонты'],
              ['purchase', 'Закупка'],
            ].map(([value, label]) => {
              const isActive = activeTab === value
              return (
                <button
                  key={value}
                  onClick={() => setActiveTab(value as Tab)}
                  className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${isActive ? 'bg-sky-500/90 text-white shadow-[0_12px_28px_rgba(59,130,246,0.28)]' : 'border border-white/60 bg-white/38 text-slate-700 shadow-sm backdrop-blur-2xl hover:bg-white/55'}`}
                >
                  {label}
                </button>
              )
            })}
          </nav>
        </header>

        {activeTab === 'dashboard' ? (
          <section className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <button
                type="button"
                onClick={() => setActiveTab('vehicles')}
                onMouseUp={() => setActiveTab('vehicles')}
                className={`${glass('cursor-pointer p-5 text-left transition hover:-translate-y-0.5 hover:bg-white/38 active:scale-[0.99]')}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-slate-500">Единиц техники</div>
                    <div className="mt-2 text-3xl font-semibold text-slate-900">{vehicles.length} шт.</div>
                    <div className="mt-2 text-xs text-slate-500">Открыть весь список техники</div>
                  </div>
                  <span className="text-slate-400">→</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('analytics')}
                onMouseUp={() => setActiveTab('analytics')}
                className={`${glass('cursor-pointer p-5 text-left transition hover:-translate-y-0.5 hover:bg-white/38 active:scale-[0.99]')}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-slate-500">Проблемных машин</div>
                    <div className="mt-2 text-3xl font-semibold text-slate-900">{criticalRepairCandidates.length} шт.</div>
                    <div className="mt-2 text-xs text-slate-500">Перейти к аналитике проблем</div>
                  </div>
                  <span className="text-slate-400">→</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('registries')}
                onMouseUp={() => setActiveTab('registries')}
                className={`${glass('cursor-pointer p-5 text-left transition hover:-translate-y-0.5 hover:bg-white/38 active:scale-[0.99]')}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-slate-500">Машин с малыми доливами</div>
                    <div className="mt-2 text-3xl font-semibold text-slate-900">{frequentTopUpVehicles.length} шт.</div>
                    <div className="mt-2 text-xs text-slate-500">Открыть реестр частых малых доливов</div>
                  </div>
                  <span className="text-slate-400">→</span>
                </div>
              </button>
              <div className={glass('p-5 text-left')}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-slate-500">Номенклатурных позиций</div>
                    <div className="mt-2 text-3xl font-semibold text-slate-900">{products.length} поз.</div>
                    <div className="mt-2 text-xs text-slate-500">Текущая база номенклатуры для тестирования</div>
                  </div>
                  <span className="text-slate-400">•</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-1">
              <div className={glass('p-5')}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Статусы техники</h2>
                  <span className="text-sm text-slate-500">нажмите на статус</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {VEHICLE_STATUSES.map((status) => {
                    const count = vehicles.filter((vehicle) => vehicle.status === status.value).length
                    return (
                      <button
                        key={status.value}
                        type="button"
                        onClick={() => setDashboardStatusModal(status.value)}
                        className="rounded-3xl border border-white/60 bg-white/38 p-4 text-left shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5 hover:bg-white/52"
                      >
                        <div className="text-sm text-slate-500">{status.label}</div>
                        <div className="mt-2 text-2xl font-semibold text-slate-900">{count} шт.</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className={glass('p-5')}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Плановые замены</h2>
                  <span className="text-sm text-slate-500">ТО</span>
                </div>
                <div className="mt-4 space-y-3">
                  {plannedReplacementLeaders.length === 0 ? (
                    <div className="rounded-3xl border border-white/60 bg-white/30 p-4 text-sm text-slate-500 backdrop-blur-2xl">Плановых замен по текущему периоду не найдено.</div>
                  ) : (
                    plannedReplacementLeaders.map((item) => (
                      <button key={item.vehicle.id} onClick={() => { setSelectedVehicleId(item.vehicle.id); setActiveTab('vehicles'); setIsVehicleDetailsOpen(true) }} className="w-full rounded-3xl border border-white/60 bg-white/38 p-4 text-left shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5">
                        <div className="font-semibold text-slate-900">{item.vehicle.name}</div>
                        <div className="mt-2 text-sm text-slate-600">ТО: {formatNumber(item.plannedReplacementQty)} л / кг · операций: {item.plannedReplacementOps} шт.</div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className={glass('p-5')}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Аварийные доливы</h2>
                  <span className="text-sm text-slate-500">крупные доливы</span>
                </div>
                <div className="mt-4 space-y-3">
                  {emergencyTopUpLeaders.length === 0 ? (
                    <div className="rounded-3xl border border-white/60 bg-white/30 p-4 text-sm text-slate-500 backdrop-blur-2xl">Крупные аварийные доливы не обнаружены.</div>
                  ) : (
                    emergencyTopUpLeaders.map((item) => (
                      <button key={item.vehicle.id} onClick={() => { setSelectedVehicleId(item.vehicle.id); setActiveTab('vehicles'); setIsVehicleDetailsOpen(true) }} className="w-full rounded-3xl border border-rose-100/70 bg-rose-50/35 p-4 text-left shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5">
                        <div className="font-semibold text-slate-900">{item.vehicle.name}</div>
                        <div className="mt-2 text-sm text-slate-600">Аварийный долив: {formatNumber(item.emergencyTopUpQty)} л / кг · операций: {item.emergencyTopUpOps} шт.</div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className={glass('p-5')}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Подозрительные малые доливы</h2>
                  <span className="text-sm text-slate-500">повторяемость</span>
                </div>
                <div className="mt-4 space-y-3">
                  {smallTopUpLeaders.length === 0 ? (
                    <div className="rounded-3xl border border-white/60 bg-white/30 p-4 text-sm text-slate-500 backdrop-blur-2xl">Частые малые доливы не обнаружены.</div>
                  ) : (
                    smallTopUpLeaders.map((item) => (
                      <button key={item.vehicle.id} onClick={() => { setSelectedVehicleId(item.vehicle.id); setActiveTab('vehicles'); setIsVehicleDetailsOpen(true) }} className="w-full rounded-3xl border border-amber-100/70 bg-amber-50/35 p-4 text-left shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5">
                        <div className="font-semibold text-slate-900">{item.vehicle.name}</div>
                        <div className="mt-2 text-sm text-slate-600">Малых доливов: {item.smallTopUpOps} шт. · объем: {formatNumber(item.smallTopUpQty)} л / кг</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === 'vehicles' ? (
          <section className="space-y-4">
            <div className={glass('p-5')}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Техника</h2>
                  <p className="mt-1 text-sm text-slate-500">Весь парк списком. Чтобы изменить интервалы ТО и карточку машины, нажмите «Интервалы ТО» или значок ✎ на нужной технике.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-slate-500">Всего: {filteredVehicles.length}</div>
                  <button
                    onClick={() => {
                      setReopenVehicleDetailsAfterVehicleModal(false)
                      setEditingVehicleId(null)
                      setVehicleForm(emptyVehicleDraft())
                      setIsVehicleModalOpen(true)
                    }}
                    className="rounded-2xl bg-sky-500/90 px-4 py-2 text-sm font-medium text-white shadow-[0_12px_28px_rgba(59,130,246,0.28)] transition hover:bg-sky-600/90"
                  >
                    Добавить технику
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <input value={vehicleSearch} onChange={(e) => setVehicleSearch(e.target.value)} placeholder="Поиск по технике / номеру / сотруднику" className="rounded-2xl border border-white/45 bg-white/26 px-4 py-3 outline-none backdrop-blur-3xl placeholder:text-slate-400 md:col-span-2" />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-2">
                  <select value={vehicleTypeFilter} onChange={(e) => setVehicleTypeFilter(e.target.value as 'all' | VehicleType)} className="rounded-2xl border border-white/45 bg-white/26 px-4 py-3 outline-none backdrop-blur-3xl">
                    <option value="all">Все типы</option>
                    {VEHICLE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                  <select value={vehicleStatusFilter} onChange={(e) => setVehicleStatusFilter(e.target.value as 'all' | VehicleStatus)} className="rounded-2xl border border-white/45 bg-white/26 px-4 py-3 outline-none backdrop-blur-3xl">
                    <option value="all">Все статусы</option>
                    {VEHICLE_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
                {filteredVehicles.map((vehicle) => {
                  const vehicleIssues = movements.filter((movement) => movement.type === 'issue' && movement.vehicleId === vehicle.id)
                  const totalIssued = vehicleIssues.reduce((sum, movement) => sum + Math.abs(movement.quantity), 0)
                  const lastIssue = [...vehicleIssues].sort((a, b) => (a.date < b.date ? 1 : -1))[0]
                  const lastToDate = vehicleLastToDateMap.get(vehicle.id) ?? ''
                  const isSelected = selectedVehicle?.id === vehicle.id
                  return (
                    <div key={vehicle.id} className={`rounded-2xl border px-4 py-3 shadow-sm backdrop-blur-2xl transition ${isSelected ? 'border-sky-200/80 bg-white/40 shadow-[0_14px_35px_rgba(59,130,246,0.14)]' : 'border-white/55 bg-white/30'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <button
                          onClick={() => {
                            setSelectedVehicleId(vehicle.id)
                            setIsVehicleDetailsOpen(true)
                          }}
                          className="min-w-0 text-left"
                        >
                          <div className="truncate text-[15px] font-semibold text-slate-900">{vehicle.name}</div>
                          <div className="mt-0.5 text-xs text-slate-500">{vehicle.plate || 'Без госномера'} · {vehicle.type}</div>
                        </button>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${vehicle.status === 'repair' ? 'bg-rose-100/80 text-rose-700' : vehicle.status === 'maintenance' ? 'bg-amber-100/80 text-amber-700' : 'bg-emerald-100/80 text-emerald-700'}`}>{VEHICLE_STATUSES.find((item) => item.value === vehicle.status)?.label}</span>
                          <button
                            onClick={() => editVehicle(vehicle)}
                            aria-label="Редактировать технику"
                            title="Редактировать"
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-sky-200/70 bg-sky-50/55 text-sky-700 backdrop-blur-2xl"
                          >
                            ✎
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                        <div>Ответственный: <span className="font-medium text-slate-900">{vehicle.responsible || '—'}</span></div>
                        <div>Подразделение: <span className="font-medium text-slate-900">{vehicle.department || '—'}</span></div>
                        <div>Последнее ТО: <span className="font-medium text-slate-900">{lastToDate || 'Нет данных'}</span></div>
                        <div>Последний расход: <span className="font-medium text-slate-900">{lastIssue?.date || '—'}</span></div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border border-white/60 bg-white/40 px-2.5 py-1 text-slate-700">Расход: <span className="font-medium text-slate-900">{formatNumber(totalIssued)}</span></span>
                        <span className="rounded-full border border-white/60 bg-white/40 px-2.5 py-1 text-slate-700">ТО: <span className="font-medium text-slate-900">{vehicle.serviceIntervalDays ?? MAINTENANCE_INTERVAL_DAYS_BY_TYPE[vehicle.type]} дн.</span></span>
                        <span className="rounded-full border border-white/60 bg-white/40 px-2.5 py-1 text-slate-700">Интервал: <span className="font-medium text-slate-900">{formatNumber(vehicle.serviceIntervalRunHours ?? MAINTENANCE_INTERVAL_RUNHOURS_BY_TYPE[vehicle.type])} {vehicle.serviceRunHoursUnit || (vehicle.type === 'Грузовик' || vehicle.type === 'Автомобиль' ? 'км' : 'м/ч')}</span></span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setSelectedVehicleId(vehicle.id)
                            setIsVehicleDetailsOpen(true)
                          }}
                          className="rounded-xl border border-white/60 bg-white/30 px-3 py-1.5 text-xs text-slate-700 backdrop-blur-2xl"
                        >
                          Карточка
                        </button>
                        <button onClick={() => editVehicle(vehicle)} className="rounded-xl border border-sky-200/70 bg-sky-50/55 px-3 py-1.5 text-xs text-sky-700 backdrop-blur-2xl">Интервалы ТО</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === 'products' ? (
          <section className="space-y-4">
            <div className={glass('p-5')}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Номенклатура</h2>
                  <p className="mt-1 text-sm text-slate-500">Поиск по наименованию, категории и примечаниям.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Всего: {filteredProducts.length}</span>
                  <button
                    onClick={() => {
                      setEditingProductId(null)
                      setProductForm(emptyProductDraft())
                      setIsProductModalOpen(true)
                    }}
                    className="rounded-2xl bg-sky-500/90 px-4 py-2 text-sm font-medium text-white shadow-[0_12px_28px_rgba(59,130,246,0.28)] transition hover:bg-sky-600/90"
                  >
                    Добавить позицию
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Поиск по номенклатуре"
                  className="w-full rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-3xl placeholder:text-slate-400"
                />
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="rounded-[26px] border border-white/60 bg-white/30 p-4 shadow-sm backdrop-blur-2xl">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-slate-900">{product.name}</div>
                        <div className="mt-1 text-sm text-slate-500">{product.category}</div>
                      </div>
                      <button
                        onClick={() => editProduct(product)}
                        aria-label="Редактировать позицию"
                        title="Редактировать"
                        className="flex h-9 w-9 items-center justify-center rounded-2xl border border-sky-200/70 bg-sky-50/55 text-sky-700 backdrop-blur-2xl transition hover:-translate-y-0.5"
                      >
                        ✎
                      </button>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl bg-sky-50/35 p-3 backdrop-blur-xl">Фасовка: <span className="font-medium text-slate-900">{formatNumber(product.packSize)} {product.unit}</span></div>
                      <div className="rounded-2xl bg-slate-50/35 p-3 backdrop-blur-xl">Остаток: <span className="font-medium text-slate-900">{formatNumber(stockByProduct[product.id] ?? 0)} {product.unit}</span></div>
                      <div className="rounded-2xl bg-amber-50/35 p-3 backdrop-blur-xl">Мин.: <span className="font-medium text-slate-900">{formatNumber(product.minStock)} {product.unit}</span></div>
                      <div className="rounded-2xl bg-emerald-50/35 p-3 backdrop-blur-xl">Цена: <span className="font-medium text-slate-900">{formatMoney(product.price)}</span></div>
                    </div>
                    {product.notes ? <div className="mt-3 text-sm text-slate-500">{product.notes}</div> : null}
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => removeProduct(product.id)} className="rounded-2xl border border-rose-200/70 bg-rose-50/45 px-3 py-2 text-sm text-rose-700 backdrop-blur-xl">Удалить</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === 'directory' ? (
          <section className="space-y-4">
            <div className={glass('p-5')}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Справочник сотрудников и поставщиков</h2>
                  <p className="mt-1 text-sm text-slate-500">Единый раздел для редактирования сотрудников, должностей и поставщиков.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Всего: {filteredContacts.length}</span>
                  <button
                    onClick={() => {
                      setEditingContactId(null)
                      setContactForm(emptyContactDraft())
                      setIsContactModalOpen(true)
                    }}
                    className="rounded-2xl bg-sky-500/90 px-4 py-2 text-sm font-medium text-white shadow-[0_12px_28px_rgba(59,130,246,0.28)] transition hover:bg-sky-600/90"
                  >
                    Добавить контакт
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <input
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Поиск по имени, телефону, заметке"
                  className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-3xl placeholder:text-slate-400 md:col-span-2"
                />
                <select
                  value={contactKindFilter}
                  onChange={(e) => setContactKindFilter(e.target.value as 'all' | ContactKind)}
                  className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl"
                >
                  <option value="all">Все контакты</option>
                  <option value="person">Сотрудники</option>
                  <option value="supplier">Поставщики</option>
                </select>
              </div>

              <div className="mt-4 overflow-hidden rounded-[28px] border border-white/60 bg-white/32 shadow-sm backdrop-blur-2xl">
                <div className="max-h-[700px] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-white/48 text-slate-500 backdrop-blur-2xl">
                      <tr>
                        <th className="px-4 py-3 font-medium">Имя</th>
                        <th className="px-4 py-3 font-medium">Тип</th>
                        <th className="px-4 py-3 font-medium">Должность</th>
                        <th className="px-4 py-3 font-medium">Телефон</th>
                        <th className="px-4 py-3 font-medium">Заметка</th>
                        <th className="px-4 py-3 font-medium">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContacts.map((contact) => (
                        <tr key={contact.id} className="border-t border-slate-100/70 text-slate-700">
                          <td className="px-4 py-3 font-medium text-slate-900">{contact.name}</td>
                          <td className="px-4 py-3">{contact.kind === 'supplier' ? 'Поставщик' : 'Сотрудник'}</td>
                          <td className="px-4 py-3">{contact.kind === 'supplier' ? '—' : (contact.position || '—')}</td>
                          <td className="px-4 py-3">{contact.phone || '—'}</td>
                          <td className="px-4 py-3">{contact.note || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button onClick={() => editContact(contact)} className="rounded-2xl border border-sky-200/70 bg-sky-50/45 px-3 py-2 text-xs font-medium text-sky-700 backdrop-blur-2xl">Редактировать</button>
                              <button onClick={() => removeContact(contact.id)} className="rounded-2xl border border-rose-200/70 bg-rose-50/45 px-3 py-2 text-xs font-medium text-rose-700 backdrop-blur-2xl">Удалить</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === 'parts' ? (
          <section className="space-y-4">
            <div className={glass('p-5')}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Контроль запчастей</h2>
                  <p className="mt-1 text-sm text-slate-500">Склад запчастей по текущим остаткам и расходу на технику.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-slate-500">Позиций: {filteredSparePartRows.length}</span>
                  <button
                    onClick={() => {
                      setEditingProductId(null)
                      setProductForm({
                        ...emptyProductDraft(),
                        category: 'Запчасти',
                        unit: 'шт',
                        packSize: '1',
                      })
                      setIsProductModalOpen(true)
                    }}
                    className="rounded-2xl bg-sky-500/90 px-4 py-2 text-sm font-medium text-white shadow-[0_12px_28px_rgba(59,130,246,0.28)] transition hover:bg-sky-600/90"
                  >
                    Добавить запчасть
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <input
                  value={partSearch}
                  onChange={(e) => setPartSearch(e.target.value)}
                  placeholder="Поиск по запчастям"
                  className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400 md:col-span-2"
                />
                <div className="rounded-2xl border border-white/60 bg-white/34 px-4 py-3 text-sm text-slate-600 backdrop-blur-2xl">
                  Популярных: <span className="font-semibold text-slate-900">{popularSparePartRows.length} поз.</span>
                </div>
              </div>

              <div className="mt-4 rounded-[24px] border border-white/55 bg-white/26 p-4 backdrop-blur-2xl">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900">Популярные запчасти (часто меняются)</h3>
                  <span className="text-xs text-slate-500">Оценка по частоте расхода и количеству машин</span>
                </div>
                {popularSparePartRows.length === 0 ? (
                  <div className="mt-3 rounded-2xl border border-white/60 bg-white/40 px-4 py-3 text-sm text-slate-500">Пока нет популярных позиций: недостаточно расходных операций.</div>
                ) : (
                  <div className="mt-3 grid gap-3 lg:grid-cols-3">
                    {popularSparePartRows.slice(0, 6).map((row) => (
                      <div key={`popular-${row.product.id}`} className="rounded-2xl border border-white/60 bg-white/40 p-3 text-sm">
                        <div className="font-medium text-slate-900">{row.product.name}</div>
                        <div className="mt-1 text-xs text-slate-500">{row.product.category || 'Запчасти'}</div>
                        <div className="mt-2 space-y-1 text-xs text-slate-600">
                          <div>Расход 30 дн.: <span className="font-medium text-slate-900">{formatNumber(row.last30Issue)} {row.product.unit || 'шт'}</span></div>
                          <div>Операций 30 дн.: <span className="font-medium text-slate-900">{row.opsLast30} шт.</span></div>
                          <div>Прогноз 30 дн.: <span className="font-medium text-slate-900">{formatNumber(row.forecast30)} {row.product.unit || 'шт'}</span></div>
                          <div>Машин в расходе: <span className="font-medium text-slate-900">{row.linkedVehiclesCount} шт.</span></div>
                          <div>Средний интервал: <span className="font-medium text-slate-900">{row.avgIntervalDays ? `${Math.round(row.avgIntervalDays)} дн.` : '—'}</span></div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => openMovementForPart(row.product.id, 'receipt')} className="rounded-xl border border-emerald-200/70 bg-emerald-50/55 px-3 py-1.5 text-xs text-emerald-700 backdrop-blur-2xl">Приход</button>
                          <button onClick={() => openMovementForPart(row.product.id, 'issue')} className="rounded-xl border border-sky-200/70 bg-sky-50/55 px-3 py-1.5 text-xs text-sky-700 backdrop-blur-2xl">Расход</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 overflow-hidden rounded-[24px] border border-white/55 bg-white/26 backdrop-blur-2xl">
                <div className="max-h-[68vh] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-white/55 text-slate-500 backdrop-blur-2xl">
                      <tr>
                        <th className="px-4 py-3 font-medium">Запчасть</th>
                        <th className="px-4 py-3 font-medium">Остаток</th>
                        <th className="px-4 py-3 font-medium">Расход 30 дн.</th>
                        <th className="px-4 py-3 font-medium">Прогноз 30 дн.</th>
                        <th className="px-4 py-3 font-medium">Машин в расходе</th>
                        <th className="px-4 py-3 font-medium">Сигнал</th>
                        <th className="px-4 py-3 font-medium">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSparePartRows.length === 0 ? (
                        <tr>
                          <td className="px-4 py-4 text-slate-500" colSpan={7}>Нет запчастей по текущему фильтру.</td>
                        </tr>
                      ) : (
                        filteredSparePartRows.map((row) => (
                          <tr key={row.product.id} className="border-t border-slate-100/80 text-slate-700">
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-900">{row.product.name}</div>
                              <div className="text-xs text-slate-500">{row.product.category || 'Запчасти'}</div>
                            </td>
                            <td className="px-4 py-3">{formatNumber(row.current)} {row.product.unit || 'шт'}</td>
                            <td className="px-4 py-3">{formatNumber(row.last30Issue)} {row.product.unit || 'шт'}</td>
                            <td className="px-4 py-3">{formatNumber(row.forecast30)} {row.product.unit || 'шт'}</td>
                            <td className="px-4 py-3">{row.linkedVehiclesCount} шт.</td>
                            <td className="px-4 py-3">
                              {row.isPopular ? (
                                <span className="rounded-full bg-sky-100/80 px-3 py-1 text-xs font-medium text-sky-700">Популярная</span>
                              ) : row.lowStock ? (
                                <span className="rounded-full bg-rose-100/80 px-3 py-1 text-xs font-medium text-rose-700">Ниже минимума</span>
                              ) : (
                                <span className="rounded-full bg-emerald-100/80 px-3 py-1 text-xs font-medium text-emerald-700">В норме</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button onClick={() => openMovementForPart(row.product.id, 'receipt')} className="rounded-xl border border-emerald-200/70 bg-emerald-50/55 px-3 py-1.5 text-xs text-emerald-700 backdrop-blur-2xl">Приход</button>
                                <button onClick={() => openMovementForPart(row.product.id, 'issue')} className="rounded-xl border border-sky-200/70 bg-sky-50/55 px-3 py-1.5 text-xs text-sky-700 backdrop-blur-2xl">Расход</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === 'movements' ? (
          <section className="space-y-4">
            <div className={glass('p-5')}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">Журнал движений</h2>
                  <button
                    onClick={() => {
                      setEditingMovementId(null)
                      setMovementForm((prev) => ({
                        ...emptyMovementDraft(prev.productId || products[0]?.id || ''),
                        type: 'issue',
                        purposeKind: 'ТО',
                        purposeSystem: 'Двигатель',
                        purpose: composeMovementPurpose('ТО', 'Двигатель', 'Расход'),
                      }))
                      setReceiptLines([emptyReceiptLine(products[0]?.id ?? '')])
                      setIssueLines([emptyIssueLine(availableProductsForOutflow[0]?.id ?? products[0]?.id ?? '')])
                      setIsMovementFormOpen((prev) => !prev)
                    }}
                    className="rounded-2xl bg-sky-500/90 px-4 py-2 text-sm font-medium text-white shadow-[0_12px_28px_rgba(59,130,246,0.28)] transition hover:bg-sky-600/90"
                  >
                    {isMovementFormOpen ? 'Скрыть форму' : 'Добавить операцию'}
                  </button>
                </div>
                <span className="text-sm text-slate-500">Записей: {filteredMovements.length}</span>
              </div>

              {isMovementFormOpen ? (
                <div className="mt-4 rounded-[28px] border border-white/60 bg-white/28 p-4 shadow-sm backdrop-blur-3xl">
                  <div className="mb-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
                    <div>
                      <div className="text-base font-semibold text-slate-900">{editingMovementId ? 'Редактирование операции' : 'Новая операция'}</div>
                      <div className="mt-1 text-sm text-slate-500">Сначала выберите тип операции, затем технику и укажите, на что именно идет масло: ТО, долив, ремонт и т.д.</div>
                    </div>
                    <div className="rounded-3xl border border-sky-100/70 bg-sky-50/45 p-4 text-sm text-slate-600 backdrop-blur-2xl">
                      <div className="font-medium text-slate-900">Как заполнять расход</div>
                      <ul className="mt-2 space-y-1 text-sm">
                        <li>• <span className="font-medium">ТО</span> — плановая замена масла</li>
                        <li>• <span className="font-medium">Долив</span> — небольшое пополнение между ТО</li>
                        <li>• <span className="font-medium">Ремонт</span> — расход при ремонте узла</li>
                      </ul>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-2 text-sm text-slate-600">
                        <span>Дата</span>
                        <input type="date" value={movementForm.date} onChange={(e) => setMovementForm((prev) => ({ ...prev, date: e.target.value }))} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl" />
                      </label>

                      <label className="grid gap-2 text-sm text-slate-600">
                        <span>Тип операции</span>
                        <select
                          value={movementForm.type}
                          onChange={(e) => {
                            const nextType = e.target.value as MovementType
                            setMovementForm((prev) => ({
                              ...prev,
                              type: nextType,
                              purposeKind: nextType === 'receipt' ? 'Приход' : nextType === 'adjustment' ? 'Корректировка' : prev.purposeKind,
                              purposeSystem: nextType === 'receipt' ? '' : nextType === 'adjustment' ? '' : prev.purposeSystem || 'Двигатель',
                              purpose: nextType === 'receipt'
                                ? 'Приход'
                                : nextType === 'adjustment'
                                  ? 'Корректировка'
                                  : composeMovementPurpose(prev.purposeKind || 'ТО', prev.purposeSystem || 'Двигатель', 'Расход'),
                            }))
                            if (nextType === 'receipt') {
                              setReceiptLines((current) => current.length ? current : [emptyReceiptLine(products[0]?.id ?? '')])
                            }
                            if (nextType === 'issue') {
                              const fallbackProductId = availableProductsForOutflow[0]?.id ?? products[0]?.id ?? ''
                              setIssueLines((current) => current.length ? current : [emptyIssueLine(fallbackProductId)])
                            }
                          }}
                          className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl"
                        >
                          <option value="receipt">Приход</option>
                          <option value="issue">Расход</option>
                          <option value="adjustment">Корректировка</option>
                        </select>
                      </label>

                      {movementForm.type === 'receipt' ? (
                        <div className="grid gap-3 sm:col-span-3">
                          <div className="flex items-center justify-between gap-3 rounded-3xl border border-white/55 bg-white/24 px-4 py-3 text-sm text-slate-600 backdrop-blur-2xl">
                            <div>
                              <div className="font-medium text-slate-900">Позиции прихода</div>
                              <div className="mt-1 text-xs text-slate-500">Добавьте несколько позиций в один документ: количество и цену по каждой строке.</div>
                            </div>
                            {editingMovementId ? (
                              <span className="rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3 py-2 text-xs text-slate-600">В режиме редактирования доступна 1 позиция</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setReceiptLines((current) => [...current, emptyReceiptLine(products[0]?.id ?? '')])}
                                className="rounded-2xl border border-sky-200/70 bg-sky-50/45 px-3 py-2 text-sm text-sky-700 backdrop-blur-2xl"
                              >
                                + Добавить позицию
                              </button>
                            )}
                          </div>

                          <div className="space-y-3">
                            {receiptLines.map((line, index) => {
                              const lineProduct = productMap.get(line.productId)
                              const lineTotal = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0)
                              return (
                                <div key={line.id} className="grid gap-3 rounded-3xl border border-white/55 bg-white/24 p-4 backdrop-blur-2xl md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(140px,0.7fr)_minmax(160px,0.85fr)_minmax(150px,auto)]">
                                  <label className="grid gap-2 text-sm text-slate-600 md:col-span-2 xl:col-span-1">
                                    <span>Позиция #{index + 1}</span>
                                    <select
                                      value={line.productId}
                                      onChange={(e) => setReceiptLines((current) => current.map((item) => item.id === line.id ? { ...item, productId: e.target.value } : item))}
                                      className="min-w-0 rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl"
                                    >
                                      {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                                    </select>
                                  </label>
                                  <label className="grid gap-2 text-sm text-slate-600">
                                    <span>Количество</span>
                                    <input
                                      value={line.quantity}
                                      onChange={(e) => setReceiptLines((current) => current.map((item) => item.id === line.id ? { ...item, quantity: e.target.value } : item))}
                                      placeholder="10"
                                      className="min-w-0 rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400"
                                    />
                                  </label>
                                  <label className="grid gap-2 text-sm text-slate-600">
                                    <span>Цена за ед.</span>
                                    <input
                                      value={line.unitPrice}
                                      onChange={(e) => setReceiptLines((current) => current.map((item) => item.id === line.id ? { ...item, unitPrice: e.target.value } : item))}
                                      placeholder="250"
                                      className="min-w-0 rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400"
                                    />
                                  </label>
                                  <div className="flex min-w-0 items-end justify-between gap-3 md:col-span-2 xl:col-span-1 xl:flex-col xl:items-end">
                                    <div className="text-right text-sm text-slate-500">
                                      <div>Сумма</div>
                                      <div className="mt-1 font-semibold text-slate-900">{formatMoney(lineTotal)}</div>
                                      <div className="mt-1 text-xs text-slate-500">{lineProduct?.unit ?? ''}</div>
                                    </div>
                                    {editingMovementId ? null : (
                                      <button
                                        type="button"
                                        onClick={() => setReceiptLines((current) => current.length === 1 ? [emptyReceiptLine(products[0]?.id ?? '')] : current.filter((item) => item.id !== line.id))}
                                        className="rounded-2xl border border-rose-200/70 bg-rose-50/45 px-3 py-2 text-sm text-rose-700 backdrop-blur-2xl"
                                      >
                                        Удалить
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ) : movementForm.type === 'issue' ? (
                        <div className="grid gap-3 sm:col-span-3">
                          <div className="flex items-center justify-between gap-3 rounded-3xl border border-white/55 bg-white/24 px-4 py-3 text-sm text-slate-600 backdrop-blur-2xl">
                            <div>
                              <div className="font-medium text-slate-900">Позиции расхода</div>
                              <div className="mt-1 text-xs text-slate-500">Добавьте несколько товаров в одно списание по машине (например масло + фильтр).</div>
                            </div>
                            {editingMovementId ? (
                              <span className="rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3 py-2 text-xs text-slate-600">В режиме редактирования доступна 1 позиция</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setIssueLines((current) => [...current, emptyIssueLine(availableProductsForOutflow[0]?.id ?? '')])}
                                className="rounded-2xl border border-sky-200/70 bg-sky-50/45 px-3 py-2 text-sm text-sky-700 backdrop-blur-2xl"
                              >
                                + Добавить позицию
                              </button>
                            )}
                          </div>

                          <div className="space-y-3">
                            {issueLines.map((line, index) => {
                              const lineProduct = productMap.get(line.productId)
                              return (
                                <div key={line.id} className="grid gap-3 rounded-3xl border border-white/55 bg-white/24 p-4 backdrop-blur-2xl md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(140px,0.7fr)_minmax(180px,auto)]">
                                  <label className="grid gap-2 text-sm text-slate-600 md:col-span-2 xl:col-span-1">
                                    <span>Позиция #{index + 1}</span>
                                    <select
                                      value={line.productId}
                                      onChange={(e) => setIssueLines((current) => current.map((item) => item.id === line.id ? { ...item, productId: e.target.value } : item))}
                                      className="min-w-0 rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl"
                                    >
                                      {availableProductsForOutflow.length === 0 ? <option value="">Нет позиций в наличии</option> : null}
                                      {availableProductsForOutflow.map((product) => (
                                        <option key={product.id} value={product.id}>{product.name} · в наличии {formatNumber(stockByProduct[product.id] ?? 0)} {product.unit}</option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="grid gap-2 text-sm text-slate-600">
                                    <span>Количество</span>
                                    <input
                                      value={line.quantity}
                                      onChange={(e) => setIssueLines((current) => current.map((item) => item.id === line.id ? { ...item, quantity: e.target.value } : item))}
                                      placeholder="Например: 20"
                                      className="min-w-0 rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400"
                                    />
                                  </label>
                                  <div className="flex min-w-0 items-end justify-between gap-3 md:col-span-2 xl:col-span-1 xl:flex-col xl:items-end">
                                    <div className="text-right text-sm text-slate-500">
                                      <div>Ед. изм.</div>
                                      <div className="mt-1 font-semibold text-slate-900">{lineProduct?.unit || '—'}</div>
                                    </div>
                                    {editingMovementId ? null : (
                                      <button
                                        type="button"
                                        onClick={() => setIssueLines((current) => current.length === 1 ? [emptyIssueLine(availableProductsForOutflow[0]?.id ?? '')] : current.filter((item) => item.id !== line.id))}
                                        className="rounded-2xl border border-rose-200/70 bg-rose-50/45 px-3 py-2 text-sm text-rose-700 backdrop-blur-2xl"
                                      >
                                        Удалить
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          <label className="grid gap-2 text-sm text-slate-600 sm:col-span-2">
                            <span>Техника</span>
                            <select value={movementForm.vehicleId} onChange={(e) => setMovementForm((prev) => ({ ...prev, vehicleId: e.target.value }))} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl">
                              <option value="">Без привязки к технике</option>
                              {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>)}
                            </select>
                          </label>
                        </div>
                      ) : (
                        <>
                          <label className="grid gap-2 text-sm text-slate-600 sm:col-span-2">
                            <span>Номенклатура</span>
                            <select value={movementForm.productId} onChange={(e) => setMovementForm((prev) => ({ ...prev, productId: e.target.value }))} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl">
                              {availableProductsForOutflow.length === 0 ? <option value="">Нет позиций в наличии</option> : null}
                              {availableProductsForOutflow.map((product) => <option key={product.id} value={product.id}>{product.name} · в наличии {formatNumber(stockByProduct[product.id] ?? 0)} {product.unit}</option>)}
                            </select>
                          </label>

                          <label className="grid gap-2 text-sm text-slate-600">
                            <span>Количество</span>
                            <input value={movementForm.quantity} onChange={(e) => setMovementForm((prev) => ({ ...prev, quantity: e.target.value }))} placeholder="Например: 10" className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400" />
                          </label>

                          <label className="grid gap-2 text-sm text-slate-600">
                            <span>Техника</span>
                            <select value={movementForm.vehicleId} onChange={(e) => setMovementForm((prev) => ({ ...prev, vehicleId: e.target.value }))} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl">
                              <option value="">Без привязки к технике</option>
                              {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>)}
                            </select>
                          </label>
                        </>
                      )}

                      {movementForm.type === 'issue' ? (
                        <>
                          <label className="grid gap-2 text-sm text-slate-600">
                            <span>На что расход</span>
                            <select
                              value={movementForm.purposeKind}
                              onChange={(e) => {
                                const nextKind = e.target.value
                                setMovementForm((prev) => ({
                                  ...prev,
                                  purposeKind: nextKind,
                                  purpose: composeMovementPurpose(nextKind, prev.purposeSystem, 'Расход'),
                                }))
                              }}
                              className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl"
                            >
                              {MOVEMENT_PURPOSE_KIND_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                          </label>

                          <label className="grid gap-2 text-sm text-slate-600">
                            <span>Система / узел</span>
                            <select
                              value={movementForm.purposeSystem}
                              onChange={(e) => {
                                const nextSystem = e.target.value
                                setMovementForm((prev) => ({
                                  ...prev,
                                  purposeSystem: nextSystem,
                                  purpose: composeMovementPurpose(prev.purposeKind, nextSystem, 'Расход'),
                                }))
                              }}
                              className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl"
                            >
                              {MOVEMENT_PURPOSE_SYSTEM_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                          </label>
                        </>
                      ) : null}

                      <label className="grid gap-2 text-sm text-slate-600 sm:col-span-2">
                        <span>Пробег / моточасы</span>
                        <input value={movementForm.runHours} onChange={(e) => setMovementForm((prev) => ({ ...prev, runHours: e.target.value }))} placeholder="Например: 1450 м/ч или 235000 км" className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400" />
                      </label>
                    </div>

                    <div className="grid gap-3">
                      <label className="grid gap-2 text-sm text-slate-600">
                        <span>{movementForm.type === 'issue' ? 'Кому выдано' : movementForm.type === 'receipt' ? 'Поставщик / источник' : 'Ответственный'}</span>
                        <input list={movementForm.type === 'receipt' ? 'supplier-list' : 'people-list'} value={movementForm.counterparty} onChange={(e) => setMovementForm((prev) => ({ ...prev, counterparty: e.target.value }))} placeholder={movementForm.type === 'issue' ? 'ФИО получателя' : 'Контрагент / источник'} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400" />
                      </label>

                      <label className="grid gap-2 text-sm text-slate-600">
                        <span>Документ</span>
                        <input value={movementForm.documentNo} onChange={(e) => setMovementForm((prev) => ({ ...prev, documentNo: e.target.value }))} placeholder="Накладная, акт, путевой лист" className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400" />
                      </label>

                      <label className="grid gap-2 text-sm text-slate-600">
                        <span>Назначение операции</span>
                        <input value={movementForm.purpose} onChange={(e) => setMovementForm((prev) => ({ ...prev, purpose: e.target.value }))} placeholder="Например: ТО · Гидравлика" className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400" />
                      </label>

                      <label className="grid gap-2 text-sm text-slate-600">
                        <span>Комментарий</span>
                        <textarea value={movementForm.note} onChange={(e) => setMovementForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Что именно сделано, замечания, причина расхода" rows={4} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400" />
                      </label>

                      <div className="rounded-3xl border border-white/55 bg-white/24 p-4 text-sm text-slate-600 backdrop-blur-2xl">
                        <div className="font-medium text-slate-900">Как будет записано</div>
                        <div className="mt-2">{movementForm.type === 'receipt' ? 'Приход' : movementForm.type === 'adjustment' ? 'Корректировка' : movementForm.purpose || composeMovementPurpose(movementForm.purposeKind, movementForm.purposeSystem, 'Расход')}</div>
                        {movementForm.type === 'receipt' ? (
                          <div className="mt-3 space-y-2 rounded-2xl bg-sky-50/45 px-3 py-3 text-sm text-slate-700">
                            <div>Позиций в документе: <span className="font-semibold text-slate-900">{receiptLines.filter((line) => line.productId && Number(line.quantity) > 0).length}</span></div>
                            <div>Сумма прихода: <span className="font-semibold text-slate-900">{formatMoney(receiptLines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0), 0))}</span></div>
                          </div>
                        ) : movementForm.type === 'issue' ? (
                          <div className="mt-3 space-y-2 rounded-2xl bg-rose-50/45 px-3 py-3 text-sm text-slate-700">
                            <div>Позиции в списании: <span className="font-semibold text-slate-900">{issueLines.filter((line) => line.productId && Number(line.quantity) > 0).length}</span></div>
                            <div>Машина: <span className="font-semibold text-slate-900">{vehicleMap.get(movementForm.vehicleId)?.name || 'не выбрана'}</span></div>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button onClick={saveMovement} className="rounded-2xl bg-sky-500/90 px-4 py-3 font-medium text-white shadow-[0_12px_28px_rgba(59,130,246,0.28)] transition hover:bg-sky-600/90">{editingMovementId ? 'Сохранить изменения' : 'Сохранить операцию'}</button>
                        <button onClick={closeMovementComposer} className="rounded-2xl border border-white/60 bg-white/34 px-4 py-3 text-sm font-medium text-slate-700 backdrop-blur-2xl">Отмена</button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <select value={movementTypeFilter} onChange={(e) => setMovementTypeFilter(e.target.value as 'all' | MovementType)} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl">
                  <option value="all">Все операции</option>
                  <option value="receipt">Только приход</option>
                  <option value="issue">Только расход</option>
                  <option value="adjustment">Только корректировка</option>
                </select>
                <select value={movementProductFilter} onChange={(e) => setMovementProductFilter(e.target.value)} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl">
                  <option value="all">Вся номенклатура</option>
                  {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
                <select value={movementVehicleFilter} onChange={(e) => setMovementVehicleFilter(e.target.value)} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl">
                  <option value="all">Вся техника</option>
                  {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>)}
                </select>
                <input type="date" value={movementDateFilter} onChange={(e) => setMovementDateFilter(e.target.value)} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl" />
                <select value={movementSortOrder} onChange={(e) => setMovementSortOrder(e.target.value as 'desc' | 'asc')} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl">
                  <option value="desc">Сначала новые даты</option>
                  <option value="asc">Сначала старые даты</option>
                </select>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <button onClick={() => { setEditingMovementId(null); setMovementTypeFilter('issue'); setIsMovementFormOpen(true); setMovementForm((prev) => ({ ...prev, type: 'issue', productId: availableProductsForOutflow[0]?.id ?? '', purposeKind: 'ТО', purposeSystem: prev.purposeSystem || 'Двигатель', purpose: composeMovementPurpose('ТО', prev.purposeSystem || 'Двигатель', 'Расход') })); setIssueLines([emptyIssueLine(availableProductsForOutflow[0]?.id ?? '')]) }} className="rounded-2xl border border-white/60 bg-white/30 px-3 py-2 text-slate-700 backdrop-blur-2xl">Быстрый расход на ТО</button>
                <button onClick={() => { setEditingMovementId(null); setMovementTypeFilter('issue'); setIsMovementFormOpen(true); setMovementForm((prev) => ({ ...prev, type: 'issue', productId: availableProductsForOutflow[0]?.id ?? '', purposeKind: 'Долив', purposeSystem: prev.purposeSystem || 'Двигатель', purpose: composeMovementPurpose('Долив', prev.purposeSystem || 'Двигатель', 'Расход') })); setIssueLines([emptyIssueLine(availableProductsForOutflow[0]?.id ?? '')]) }} className="rounded-2xl border border-white/60 bg-white/30 px-3 py-2 text-slate-700 backdrop-blur-2xl">Быстрый расход на долив</button>
                <button onClick={() => { setEditingMovementId(null); setMovementTypeFilter('receipt'); setIsMovementFormOpen(true); setMovementForm((prev) => ({ ...prev, type: 'receipt', productId: products[0]?.id ?? '', purposeKind: 'Приход', purposeSystem: '', purpose: 'Приход' })); setReceiptLines([emptyReceiptLine(products[0]?.id ?? '')]); setIssueLines([emptyIssueLine(availableProductsForOutflow[0]?.id ?? products[0]?.id ?? '')]) }} className="rounded-2xl border border-white/60 bg-white/30 px-3 py-2 text-slate-700 backdrop-blur-2xl">Быстрый приход</button>
                {movementDateFilter ? <button onClick={() => setMovementDateFilter('')} className="rounded-2xl border border-sky-200/70 bg-sky-50/45 px-3 py-2 text-sky-700 backdrop-blur-2xl">Сбросить дату</button> : null}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/55 bg-white/22 px-4 py-3 text-sm text-slate-500 backdrop-blur-2xl">
                <div>Ниже — все операции по складу: приход, расход и корректировки.</div>
                <div>Для расхода теперь видно: <span className="font-medium text-slate-700">на что</span> и <span className="font-medium text-slate-700">по какой машине</span>.</div>
              </div>

              <div className="mt-4 overflow-hidden rounded-[28px] border border-white/60 bg-white/32 shadow-sm backdrop-blur-2xl">
                <div className="max-h-[720px] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-white/48 text-slate-500 backdrop-blur-2xl">
                      <tr>
                        <th className="px-4 py-3 font-medium">Дата</th>
                        <th className="px-4 py-3 font-medium">Операция</th>
                        <th className="px-4 py-3 font-medium">Номенклатура</th>
                        <th className="px-4 py-3 font-medium">Количество</th>
                        <th className="px-4 py-3 font-medium">Цена / сумма</th>
                        <th className="px-4 py-3 font-medium">Техника / получатель</th>
                        <th className="px-4 py-3 font-medium">На что / назначение</th>
                        <th className="px-4 py-3 font-medium">Пробег / моточасы</th>
                        <th className="px-4 py-3 font-medium">Документ / комментарий</th>
                        <th className="px-4 py-3 font-medium">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMovements.map((movement) => {
                        const product = productMap.get(movement.productId)
                        const receiptTotalAmount = movement.type === 'receipt' ? (movement.unitPrice ?? 0) * movement.quantity : 0
                        const issueTotalAmount = movement.type === 'issue' ? Math.abs(movement.quantity) * (product?.price ?? 0) : 0
                        return (
                          <tr key={movement.id} className="border-t border-slate-100/70 text-slate-700">
                            <td className="px-4 py-3">{movement.date}</td>
                            <td className="px-4 py-3">{movement.type === 'receipt' ? 'Приход' : movement.type === 'issue' ? 'Расход' : 'Корректировка'}</td>
                            <td className="px-4 py-3">{product?.name ?? '—'}</td>
                            <td className="px-4 py-3">{formatNumber(movement.quantity)} {product?.unit ?? ''}</td>
                            <td className="px-4 py-3">
                              {movement.type === 'receipt' ? (
                                <>
                                  <div className="font-medium text-slate-900">{formatMoney(movement.unitPrice ?? 0)}</div>
                                  <div className="mt-1 text-xs text-slate-500">Сумма: {formatMoney(receiptTotalAmount)}</div>
                                </>
                              ) : movement.type === 'issue' ? (
                                <>
                                  <div className="font-medium text-slate-900">Списание: {formatMoney(issueTotalAmount)}</div>
                                  <div className="mt-1 text-xs text-slate-500">Цена: {product ? formatMoney(product.price || 0) : '—'}</div>
                                </>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-900">{vehicleMap.get(movement.vehicleId ?? '')?.name || 'Без привязки'}</div>
                              <div className="mt-1 text-xs text-slate-500">{movement.counterparty || '—'}</div>
                            </td>
                            <td className="px-4 py-3">{movement.purpose || '—'}</td>
                            <td className="px-4 py-3">{movement.runHours || '—'}</td>
                            <td className="px-4 py-3">{[movement.documentNo, movement.note].filter(Boolean).join(' · ') || '—'}</td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => editMovement(movement)}
                                className="rounded-2xl border border-sky-200/70 bg-sky-50/45 px-3 py-2 text-xs font-medium text-sky-700 backdrop-blur-2xl"
                              >
                                Редактировать
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === 'analytics' ? (
          <section className="space-y-4">
            <div className={glass('p-5')}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Анализ остатков и расхода</h2>
                  <p className="mt-1 text-sm text-slate-500">Прогноз строится по выдаче за последние {planningDays} дней.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex rounded-2xl border border-white/60 bg-white/30 p-1 backdrop-blur-2xl">
                    <button
                      onClick={() => setProblemSortMode('recent')}
                      className={`rounded-2xl px-3 py-2 text-sm transition ${problemSortMode === 'recent' ? 'bg-sky-500/90 text-white shadow-[0_10px_22px_rgba(59,130,246,0.24)]' : 'text-slate-600 hover:bg-white/40'}`}
                    >
                      Недавно
                    </button>
                    <button
                      onClick={() => setProblemSortMode('allTime')}
                      className={`rounded-2xl px-3 py-2 text-sm transition ${problemSortMode === 'allTime' ? 'bg-sky-500/90 text-white shadow-[0_10px_22px_rgba(59,130,246,0.24)]' : 'text-slate-600 hover:bg-white/40'}`}
                    >
                      За всю историю
                    </button>
                  </div>
                  <span className="text-sm text-slate-500">Горизонт планирования</span>
                  <input type="range" min="7" max="90" step="1" value={planningDays} onChange={(e) => setPlanningDays(Number(e.target.value))} />
                  <span className="rounded-full bg-sky-50/55 px-3 py-1 text-sm font-medium text-sky-700 backdrop-blur-xl">{planningDays} дн.</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="overflow-hidden rounded-[28px] border border-white/60 bg-white/40 shadow-[0_24px_80px_rgba(91,156,255,0.16)] backdrop-blur-[26px]">
                <div className="max-h-[760px] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-white/55 text-slate-500 backdrop-blur-2xl">
                      <tr>
                        <th className="px-4 py-3 font-medium">Номенклатура</th>
                        <th className="px-4 py-3 font-medium">Категория</th>
                        <th className="px-4 py-3 font-medium">Остаток</th>
                        <th className="px-4 py-3 font-medium">30 дн.</th>
                        <th className="px-4 py-3 font-medium">Пред. 30</th>
                        <th className="px-4 py-3 font-medium">Прогноз</th>
                        <th className="px-4 py-3 font-medium">Нужно купить</th>
                        <th className="px-4 py-3 font-medium">Сигнал</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsRows.map((row) => (
                        <tr key={row.product.id} className="border-t border-slate-100/70 text-slate-700">
                          <td className="px-4 py-3 font-medium text-slate-900">{row.product.name}</td>
                          <td className="px-4 py-3">{row.product.category}</td>
                          <td className="px-4 py-3">{formatNumber(row.current)} {row.product.unit}</td>
                          <td className="px-4 py-3">{formatNumber(row.last30)} {row.product.unit}</td>
                          <td className="px-4 py-3">{formatNumber(row.prev30)} {row.product.unit}</td>
                          <td className="px-4 py-3">{formatNumber(row.forecast)} {row.product.unit}</td>
                          <td className="px-4 py-3">{formatNumber(row.purchaseQty)} {row.product.unit}</td>
                          <td className="px-4 py-3">{row.anomaly ? <span className="rounded-full bg-rose-100/80 px-3 py-1 text-xs font-medium text-rose-700">Рост расхода</span> : <span className="rounded-full bg-slate-100/80 px-3 py-1 text-xs font-medium text-slate-600">Норма</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-4">
                <div className={glass('p-5')}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Кандидаты на осмотр</h3>
                    <span className="text-sm text-slate-500">{criticalRepairCandidates.length}</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {criticalRepairCandidates.length === 0 ? (
                      <div className="rounded-3xl border border-white/60 bg-white/30 p-4 text-sm text-slate-500 backdrop-blur-2xl">Подозрительных машин пока нет: система не видит выраженного перерасхода по текущим данным.</div>
                    ) : (
                      criticalRepairCandidates.slice(0, 8).map((item) => (
                        <button
                          key={item.vehicle.id}
                          onClick={() => {
                            setSelectedVehicleId(item.vehicle.id)
                            setActiveTab('vehicles')
                            setIsVehicleDetailsOpen(true)
                          }}
                          className="w-full rounded-3xl border border-white/60 bg-white/30 p-4 text-left shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-slate-900">{item.vehicle.name}</div>
                              <div className="mt-1 text-xs text-slate-500">{item.vehicle.type} · {item.vehicle.plate || 'Без номера'}</div>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${item.severity === 'critical' ? 'bg-rose-100/80 text-rose-700' : 'bg-amber-100/80 text-amber-700'}`}>
                              {item.score} балл.
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <div className="rounded-2xl bg-sky-50/45 p-3 backdrop-blur-xl">
                              <div className="text-slate-500">За 30 дней</div>
                              <div className="mt-1 font-semibold text-slate-900">{formatNumber(item.last30Qty)}</div>
                            </div>
                            <div className="rounded-2xl bg-slate-50/45 p-3 backdrop-blur-xl">
                              <div className="text-slate-500">Среднее по типу</div>
                              <div className="mt-1 font-semibold text-slate-900">{formatNumber(item.typeAverage)}</div>
                            </div>
                          </div>
                          <div className="mt-3 text-xs text-slate-600">{item.reasons.slice(0, 2).join(' · ')}</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className={glass('p-5')}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Топ расход по машинам</h3>
                    <span className="text-sm text-slate-500">30 дней</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {topConsumers.length === 0 ? (
                      <div className="rounded-3xl border border-white/60 bg-white/30 p-4 text-sm text-slate-500 backdrop-blur-2xl">Нет данных по выдачам на технику.</div>
                    ) : (
                      topConsumers.map((item, index) => (
                        <button
                          key={item.vehicle.id}
                          onClick={() => {
                            setSelectedVehicleId(item.vehicle.id)
                            setActiveTab('vehicles')
                          }}
                          className="flex w-full items-center justify-between gap-3 rounded-3xl border border-white/60 bg-white/30 p-4 text-left shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5"
                        >
                          <div className="min-w-0">
                            <div className="text-xs text-slate-400">#{index + 1}</div>
                            <div className="truncate font-semibold text-slate-900">{item.vehicle.name}</div>
                            <div className="mt-1 text-xs text-slate-500">{item.operations} опер. · {item.productKinds} вида масел</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-slate-500">Выдано</div>
                            <div className="text-lg font-semibold text-slate-900">{formatNumber(item.last30Qty)}</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className={glass('p-5')}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Подробный риск‑рейтинг техники</h3>
                <span className="text-sm text-slate-500">помогает найти машины на проверку</span>
              </div>
              <div className="mt-4 overflow-hidden rounded-[24px] border border-white/55 bg-white/26 backdrop-blur-2xl">
                <div className="max-h-[640px] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-white/50 text-slate-500 backdrop-blur-2xl">
                      <tr>
                        <th className="px-4 py-3 font-medium">Машина</th>
                        <th className="px-4 py-3 font-medium">Тип</th>
                        <th className="px-4 py-3 font-medium">30 дн.</th>
                        <th className="px-4 py-3 font-medium">Пред. 30</th>
                        <th className="px-4 py-3 font-medium">Среднее по типу</th>
                        <th className="px-4 py-3 font-medium">Опер.</th>
                        <th className="px-4 py-3 font-medium">Норма / ТО</th>
                        <th className="px-4 py-3 font-medium">Причины</th>
                        <th className="px-4 py-3 font-medium">Рекомендация</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicleRiskRows.map((item) => (
                        <tr key={item.vehicle.id} className="border-t border-slate-100/70 text-slate-700">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => {
                                setSelectedVehicleId(item.vehicle.id)
                                setActiveTab('vehicles')
                                setIsVehicleDetailsOpen(true)
                              }}
                              className="text-left"
                            >
                              <div className="font-medium text-slate-900">{item.vehicle.name}</div>
                              <div className="mt-1 text-xs text-slate-500">{item.vehicle.plate || 'Без номера'}</div>
                            </button>
                          </td>
                          <td className="px-4 py-3">{item.vehicle.type}</td>
                          <td className="px-4 py-3">{formatNumber(item.last30Qty)}</td>
                          <td className="px-4 py-3">{formatNumber(item.prev30Qty)}</td>
                          <td className="px-4 py-3">{formatNumber(item.typeAverage)}</td>
                          <td className="px-4 py-3">{item.operations}</td>
                          <td className="px-4 py-3 text-slate-600">
                            <div>{item.vehicle.serviceIntervalDays ?? MAINTENANCE_INTERVAL_DAYS_BY_TYPE[item.vehicle.type]} дн.</div>
                            <div className="mt-1 text-xs text-slate-500">
                              ТО раз в {formatNumber(item.vehicle.serviceIntervalRunHours ?? MAINTENANCE_INTERVAL_RUNHOURS_BY_TYPE[item.vehicle.type])} {item.vehicle.serviceRunHoursUnit || (item.vehicle.type === 'Грузовик' || item.vehicle.type === 'Автомобиль' ? 'км' : 'м/ч')}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {item.reasons.length === 0 ? (
                                <span className="rounded-full bg-slate-100/80 px-3 py-1 text-xs text-slate-600">Сигналов нет</span>
                              ) : (
                                item.reasons.slice(0, 3).map((reason) => (
                                  <span
                                    key={reason}
                                    className={`rounded-full px-3 py-1 text-xs ${item.severity === 'critical' ? 'bg-rose-100/80 text-rose-700' : item.severity === 'warning' ? 'bg-amber-100/80 text-amber-700' : 'bg-sky-100/80 text-sky-700'}`}
                                  >
                                    {reason}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{item.recommendation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === 'registries' ? (
          <section className="space-y-4">
            <div className={glass('p-5')}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Ремонты и контроль техники</h2>
                  <p className="mt-1 text-sm text-slate-500">Управление осмотрами и ремонтами машин, статусы обработки и последние решения механика.</p>
                </div>
                <span className="text-sm text-slate-500">{registryVehicleRows.length} машин в контуре</span>
              </div>
              <div className="mt-4 grid gap-3 xl:grid-cols-4">
                <input
                  value={registrySearch}
                  onChange={(e) => setRegistrySearch(e.target.value)}
                  placeholder="Поиск по машине, причине или примечанию"
                  className="rounded-2xl border border-white/55 bg-white/30 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400 xl:col-span-2"
                />
                <select
                  value={registryKindFilter}
                  onChange={(e) => setRegistryKindFilter(e.target.value as typeof registryKindFilter)}
                  className="rounded-2xl border border-white/55 bg-white/30 px-4 py-3 outline-none backdrop-blur-2xl"
                >
                  <option value="all">Все контуры</option>
                  <option value="noData">Без данных</option>
                  <option value="maintenance">ТО скоро / просрочено</option>
                  <option value="risk">Подозрительный расход</option>
                  <option value="topUp">Частые малые доливы</option>
                </select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    value={registryStatusFilter}
                    onChange={(e) => setRegistryStatusFilter(e.target.value as typeof registryStatusFilter)}
                    className="rounded-2xl border border-white/55 bg-white/30 px-4 py-3 outline-none backdrop-blur-2xl"
                  >
                    <option value="all">Все статусы</option>
                    {REGISTRY_STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                  <select
                    value={registryPriorityFilter}
                    onChange={(e) => setRegistryPriorityFilter(e.target.value as typeof registryPriorityFilter)}
                    className="rounded-2xl border border-white/55 bg-white/30 px-4 py-3 outline-none backdrop-blur-2xl"
                  >
                    <option value="all">Любой приоритет</option>
                    <option value="critical">Высокий</option>
                    <option value="warning">Средний</option>
                    <option value="watch">Наблюдение</option>
                    <option value="normal">Низкий</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 overflow-hidden rounded-[24px] border border-white/55 bg-white/26 backdrop-blur-2xl">
                <div className="max-h-[420px] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-white/50 text-slate-500 backdrop-blur-2xl">
                      <tr>
                        <th className="px-4 py-3 font-medium">Машина</th>
                        <th className="px-4 py-3 font-medium">Контур</th>
                        <th className="px-4 py-3 font-medium">Статус</th>
                        <th className="px-4 py-3 font-medium">Последний осмотр</th>
                        <th className="px-4 py-3 font-medium">Действие</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registryVehicleRows
                        .filter((row) => !row.hasData || row.risk || row.topUp || row.caseRow)
                        .map((row) => {
                          const statusValue = row.caseRow?.status ?? 'new'
                          return (
                            <tr key={row.vehicle.id} className="border-t border-slate-100/70 text-slate-700">
                              <td className="px-4 py-3">
                                <button onClick={() => { setSelectedVehicleId(row.vehicle.id); setActiveTab('vehicles'); setIsVehicleDetailsOpen(true) }} className="text-left">
                                  <div className="font-medium text-slate-900">{row.vehicle.name}</div>
                                  <div className="mt-1 text-xs text-slate-500">{row.vehicle.type} · {row.vehicle.responsible || 'Ответственный не указан'}</div>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${row.priority === 'critical' ? 'bg-rose-100/80 text-rose-700' : row.priority === 'warning' ? 'bg-amber-100/80 text-amber-700' : row.priority === 'watch' ? 'bg-sky-100/80 text-sky-700' : 'bg-slate-100/80 text-slate-700'}`}>
                                      Приоритет: {row.priorityLabel}
                                    </span>
                                    {row.reasonPills.slice(0, 2).map((reason) => (
                                      <span key={reason} className="rounded-full bg-white/65 px-3 py-1 text-[11px] text-slate-600 backdrop-blur-2xl">{reason}</span>
                                    ))}
                                  </div>
                                </button>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-900">{row.registryLabel}</div>
                                <div className="mt-1 text-xs text-slate-500">{row.reasonText}</div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusValue === 'repair' ? 'bg-rose-100/80 text-rose-700' : statusValue === 'inspection' ? 'bg-amber-100/80 text-amber-700' : statusValue === 'closed' ? 'bg-emerald-100/80 text-emerald-700' : 'bg-slate-100/80 text-slate-700'}`}>
                                  {REGISTRY_STATUS_OPTIONS.find((item) => item.value === statusValue)?.label}
                                </span>
                              </td>
                              <td className="px-4 py-3">{row.lastInspection ? `${row.lastInspection.date} · ${row.lastInspection.mechanic || 'без механика'}` : 'Нет записей'}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  <button onClick={() => openInspectionForVehicle(row.vehicle.id, row.risk ? 'inspection' : row.topUp ? 'observation' : 'inspection')} className="rounded-2xl border border-sky-200/70 bg-sky-50/45 px-3 py-2 text-xs text-sky-700 backdrop-blur-2xl">Осмотр</button>
                                  <button onClick={() => updateRegistryCase(row.vehicle.id, 'repair', row.caseRow?.note ?? '', row.caseRow?.owner ?? '')} className="rounded-2xl border border-rose-200/70 bg-rose-50/45 px-3 py-2 text-xs text-rose-700 backdrop-blur-2xl">В ремонт</button>
                                  <button onClick={() => updateRegistryCase(row.vehicle.id, 'closed', row.caseRow?.note ?? '', row.caseRow?.owner ?? '')} className="rounded-2xl border border-emerald-200/70 bg-emerald-50/45 px-3 py-2 text-xs text-emerald-700 backdrop-blur-2xl">Закрыть</button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              <div className={glass('p-5')}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Машины без данных</h3>
                  <span className="text-sm text-slate-500">{vehiclesWithoutData.length}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {vehiclesWithoutData.length === 0 ? (
                    <div className="rounded-3xl border border-white/60 bg-white/30 p-4 text-sm text-slate-500 backdrop-blur-2xl">Для всей техники уже есть хотя бы одна операция.</div>
                  ) : (
                    vehiclesWithoutData.map((vehicle) => {
                      const caseRow = registryCaseMap.get(vehicle.id)
                      return (
                        <button
                          key={vehicle.id}
                          onClick={() => {
                            setSelectedVehicleId(vehicle.id)
                            setActiveTab('vehicles')
                            setIsVehicleDetailsOpen(true)
                          }}
                          className="w-full rounded-3xl border border-white/60 bg-white/30 p-4 text-left shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-slate-900">{vehicle.name}</div>
                              <div className="mt-1 text-xs text-slate-500">{vehicle.type} · {vehicle.responsible || 'Ответственный не указан'}</div>
                            </div>
                            <span className="rounded-full bg-slate-100/80 px-3 py-1 text-xs font-medium text-slate-700">{REGISTRY_STATUS_OPTIONS.find((item) => item.value === (caseRow?.status ?? 'new'))?.label}</span>
                          </div>
                          <div className="mt-2 text-xs text-slate-600">Причина: по машине нет операций расхода, прихода и зафиксированных осмотров.</div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              <div className={glass('p-5')}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">ТО скоро / просрочено</h3>
                  <span className="text-sm text-slate-500">{maintenanceRegistryRows.length}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {maintenanceRegistryRows.length === 0 ? (
                    <div className="rounded-3xl border border-white/60 bg-white/30 p-4 text-sm text-slate-500 backdrop-blur-2xl">Скорых или просроченных ТО сейчас не найдено.</div>
                  ) : (
                    maintenanceRegistryRows.slice(0, 8).map((item) => (
                      <button
                        key={item.vehicle.id}
                        onClick={() => {
                          setSelectedVehicleId(item.vehicle.id)
                          setActiveTab('vehicles')
                          setIsVehicleDetailsOpen(true)
                        }}
                        className="w-full rounded-3xl border border-white/60 bg-white/30 p-4 text-left shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-slate-900">{item.vehicle.name}</div>
                            <div className="mt-1 text-xs text-slate-500">Последнее ТО: {item.lastToDate || 'нет данных'}</div>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${item.state === 'overdue' ? 'bg-rose-100/80 text-rose-700' : 'bg-amber-100/80 text-amber-700'}`}>
                            {item.state === 'overdue' ? 'Просрочено' : 'Скоро ТО'}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-slate-600">Причина: следующее ТО {item.nextDate ? `ожидалось ${item.nextDate}` : 'не рассчитано'} · интервал {item.intervalDays} дн.</div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className={glass('p-5')}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Подозрительный расход и аварийные отклонения</h3>
                  <span className="text-sm text-slate-500">{criticalRepairCandidates.length}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {criticalRepairCandidates.length === 0 ? (
                    <div className="rounded-3xl border border-white/60 bg-white/30 p-4 text-sm text-slate-500 backdrop-blur-2xl">Сейчас нет машин с выраженным аномальным расходом, аварийными доливами или резким отклонением от нормы.</div>
                  ) : (
                    criticalRepairCandidates.map((item) => {
                      const caseRow = registryCaseMap.get(item.vehicle.id)
                      return (
                        <button
                          key={item.vehicle.id}
                          onClick={() => {
                            setSelectedVehicleId(item.vehicle.id)
                            setActiveTab('vehicles')
                            setIsVehicleDetailsOpen(true)
                          }}
                          className="w-full rounded-3xl border border-white/60 bg-white/30 p-4 text-left shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-slate-900">{item.vehicle.name}</div>
                              <div className="mt-1 text-xs text-slate-500">{item.vehicle.type} · {item.last30.length} опер.</div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className={`rounded-full px-3 py-1 text-xs font-medium ${item.severity === 'critical' ? 'bg-rose-100/80 text-rose-700' : 'bg-amber-100/80 text-amber-700'}`}>
                                {item.score} балл.
                              </span>
                              <span className="rounded-full bg-slate-100/80 px-3 py-1 text-xs font-medium text-slate-700">{REGISTRY_STATUS_OPTIONS.find((row) => row.value === (caseRow?.status ?? 'new'))?.label}</span>
                            </div>
                          </div>
                          <div className="mt-3 text-xs text-slate-600">Причина: {item.reasons.slice(0, 2).join(' · ') || 'аномальный расход без уточнения причины'}</div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              <div className={glass('p-5')}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Частые малые доливы</h3>
                  <span className="text-sm text-slate-500">{frequentTopUpVehicles.length}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {frequentTopUpVehicles.length === 0 ? (
                    <div className="rounded-3xl border border-white/60 bg-white/30 p-4 text-sm text-slate-500 backdrop-blur-2xl">Хронические небольшие доливы без явных аварийных всплесков пока не обнаружены.</div>
                  ) : (
                    frequentTopUpVehicles.map((item) => {
                      const caseRow = registryCaseMap.get(item.vehicle.id)
                      return (
                        <button
                          key={item.vehicle.id}
                          onClick={() => {
                            setSelectedVehicleId(item.vehicle.id)
                            setActiveTab('vehicles')
                            setIsVehicleDetailsOpen(true)
                          }}
                          className="w-full rounded-3xl border border-white/60 bg-white/30 p-4 text-left shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-slate-900">{item.vehicle.name}</div>
                              <div className="mt-1 text-xs text-slate-500">Малых доливов: {item.smallTopUpOps} · объем: {formatNumber(item.smallTopUpQty)}</div>
                            </div>
                            <span className="rounded-full bg-slate-100/80 px-3 py-1 text-xs font-medium text-slate-700">{REGISTRY_STATUS_OPTIONS.find((row) => row.value === (caseRow?.status ?? 'new'))?.label}</span>
                          </div>
                          <div className="mt-2 text-xs text-slate-600">Причина: хронические небольшие доливы без явных аварийных всплесков · операций: {item.operations}</div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            <div className={glass('p-5')}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Реестр поступлений и остатков</h3>
                  <p className="mt-1 text-sm text-slate-500">Самостоятельный складской реестр сайта: приход, расход, текущий остаток и запас до минимального уровня.</p>
                </div>
                <span className="text-sm text-slate-500">{receiptRegistryRows.length} поз.</span>
              </div>
              <div className="mt-4 overflow-hidden rounded-[24px] border border-white/55 bg-white/26 backdrop-blur-2xl">
                <div className="max-h-[680px] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-white/50 text-slate-500 backdrop-blur-2xl">
                      <tr>
                        <th className="px-4 py-3 font-medium">Номенклатура</th>
                        <th className="px-4 py-3 font-medium">Приход</th>
                        <th className="px-4 py-3 font-medium">Расход</th>
                        <th className="px-4 py-3 font-medium">Текущий остаток</th>
                        <th className="px-4 py-3 font-medium">Базовый остаток</th>
                        <th className="px-4 py-3 font-medium">До минимума</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receiptRegistryRows.map((row) => (
                        <tr key={row.product.id} className="border-t border-slate-100/70 text-slate-700">
                          <td className="px-4 py-3 font-medium text-slate-900">{row.product.name}</td>
                          <td className="px-4 py-3">{formatNumber(row.receipts)} {row.product.unit}</td>
                          <td className="px-4 py-3">{formatNumber(row.issues)} {row.product.unit}</td>
                          <td className="px-4 py-3">{formatNumber(row.current)} {row.product.unit}</td>
                          <td className="px-4 py-3">{formatNumber(row.expectedCurrent)} {row.product.unit}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${row.minStockGap < 0 ? 'bg-rose-100/80 text-rose-700' : 'bg-emerald-100/80 text-emerald-700'}`}>
                              {row.minStockGap < 0 ? `${formatNumber(Math.abs(row.minStockGap))} ниже` : `${formatNumber(row.minStockGap)} запас`}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === 'purchase' ? (
          <section className="space-y-4">
            <div className={glass('p-5')}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Закупка</h2>
                  <p className="mt-1 text-sm text-slate-500">План закупки строится по текущим приходам, расходам, минимальному остатку и выбранному горизонту.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-slate-500">Горизонт планирования</span>
                  <input type="range" min="7" max="90" step="1" value={planningDays} onChange={(e) => setPlanningDays(Number(e.target.value))} />
                  <span className="rounded-full bg-sky-50/55 px-3 py-1 text-sm font-medium text-sky-700 backdrop-blur-xl">{planningDays} дн.</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className={glass('p-5')}>
                <div className="text-sm text-slate-500">Позиции к закупке</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">{analyticsRows.filter((row) => row.purchaseQty > 0).length} поз.</div>
              </div>
              <div className={glass('p-5')}>
                <div className="text-sm text-slate-500">Объем к закупке</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">{formatNumber(analyticsRows.reduce((sum, row) => sum + row.purchaseQty, 0))}</div>
              </div>
              <div className={glass('p-5')}>
                <div className="text-sm text-slate-500">Упаковок / бочек</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">{formatNumber(analyticsRows.reduce((sum, row) => sum + row.packsToBuy, 0))} шт.</div>
              </div>
              <div className={glass('p-5')}>
                <div className="text-sm text-slate-500">Оценка бюджета</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">{formatMoney(analyticsRows.reduce((sum, row) => sum + row.purchaseQty * (row.product.price || 0), 0))}</div>
              </div>
            </div>

            <div className={glass('p-5')}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">План закупки по номенклатуре</h3>
                  <p className="mt-1 text-sm text-slate-500">Верхние строки — позиции, которые уже нужно докупать по текущим данным.</p>
                </div>
                <span className="text-sm text-slate-500">{analyticsRows.length} поз.</span>
              </div>
              <div className="mt-4 overflow-hidden rounded-[24px] border border-white/55 bg-white/26 backdrop-blur-2xl">
                <div className="max-h-[720px] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-white/50 text-slate-500 backdrop-blur-2xl">
                      <tr>
                        <th className="px-4 py-3 font-medium">Номенклатура</th>
                        <th className="px-4 py-3 font-medium">Остаток</th>
                        <th className="px-4 py-3 font-medium">Расход за период</th>
                        <th className="px-4 py-3 font-medium">Прогноз</th>
                        <th className="px-4 py-3 font-medium">Мин. остаток</th>
                        <th className="px-4 py-3 font-medium">Нужно купить</th>
                        <th className="px-4 py-3 font-medium">Упаковок</th>
                        <th className="px-4 py-3 font-medium">Бюджет</th>
                        <th className="px-4 py-3 font-medium">Сигнал</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...analyticsRows]
                        .sort((a, b) => {
                          const needA = a.purchaseQty > 0 ? 1 : 0
                          const needB = b.purchaseQty > 0 ? 1 : 0
                          if (needB !== needA) return needB - needA
                          if (b.shortage !== a.shortage) return b.shortage - a.shortage
                          return a.product.name.localeCompare(b.product.name, 'ru')
                        })
                        .map((row) => (
                          <tr key={row.product.id} className="border-t border-slate-100/70 text-slate-700">
                            <td className="px-4 py-3 font-medium text-slate-900">{row.product.name}</td>
                            <td className="px-4 py-3">{formatNumber(row.current)} {row.product.unit}</td>
                            <td className="px-4 py-3">{formatNumber(row.last30)} {row.product.unit}</td>
                            <td className="px-4 py-3">{formatNumber(row.forecast)} {row.product.unit}</td>
                            <td className="px-4 py-3">{formatNumber(row.product.minStock)} {row.product.unit}</td>
                            <td className="px-4 py-3">{formatNumber(row.purchaseQty)} {row.product.unit}</td>
                            <td className="px-4 py-3">{formatNumber(row.packsToBuy)} шт.</td>
                            <td className="px-4 py-3">{formatMoney(row.purchaseQty * (row.product.price || 0))}</td>
                            <td className="px-4 py-3">
                              {row.purchaseQty > 0 ? (
                                <span className="rounded-full bg-rose-100/80 px-3 py-1 text-xs font-medium text-rose-700">Купить</span>
                              ) : row.anomaly ? (
                                <span className="rounded-full bg-amber-100/80 px-3 py-1 text-xs font-medium text-amber-700">Рост расхода</span>
                              ) : (
                                <span className="rounded-full bg-emerald-100/80 px-3 py-1 text-xs font-medium text-emerald-700">Достаточно</span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        ) : null}

      </div>

      {isVehicleModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/12 p-4 backdrop-blur-md">
          <div className={`${glass('w-full max-w-2xl p-5')}`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{editingVehicleId ? 'Редактирование техники' : 'Новая техника'}</h3>
                <p className="mt-1 text-sm text-slate-500">Заполните карточку и сохраните изменения.</p>
              </div>
              <button
                onClick={() => closeVehicleModal(reopenVehicleDetailsAfterVehicleModal)}
                className="rounded-2xl border border-white/60 bg-white/34 px-3 py-2 text-sm text-slate-700 backdrop-blur-2xl"
              >
                Закрыть
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={vehicleForm.name} onChange={(e) => setVehicleForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Наименование" className="rounded-2xl border border-white/45 bg-white/28 px-4 py-3 outline-none backdrop-blur-3xl placeholder:text-slate-400 sm:col-span-2" />
              <input value={vehicleForm.plate} onChange={(e) => setVehicleForm((prev) => ({ ...prev, plate: e.target.value }))} placeholder="Госномер" className="rounded-2xl border border-white/45 bg-white/28 px-4 py-3 outline-none backdrop-blur-3xl placeholder:text-slate-400" />
              <input value={vehicleForm.department} onChange={(e) => setVehicleForm((prev) => ({ ...prev, department: e.target.value }))} placeholder="Подразделение" className="rounded-2xl border border-white/45 bg-white/28 px-4 py-3 outline-none backdrop-blur-3xl placeholder:text-slate-400" />
              <select
                value={vehicleForm.type}
                onChange={(e) => {
                  const nextType = e.target.value as VehicleType
                  setVehicleForm((prev) => ({
                    ...prev,
                    type: nextType,
                    serviceIntervalDays: prev.serviceIntervalDays || String(MAINTENANCE_INTERVAL_DAYS_BY_TYPE[nextType]),
                    serviceIntervalRunHours: prev.serviceIntervalRunHours || String(MAINTENANCE_INTERVAL_RUNHOURS_BY_TYPE[nextType]),
                    serviceRunHoursUnit: prev.serviceRunHoursUnit || (nextType === 'Грузовик' || nextType === 'Автомобиль' ? 'км' : 'м/ч'),
                  }))
                }}
                className="rounded-2xl border border-white/45 bg-white/28 px-4 py-3 outline-none backdrop-blur-3xl"
              >
                {VEHICLE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <select value={vehicleForm.status} onChange={(e) => setVehicleForm((prev) => ({ ...prev, status: e.target.value as VehicleStatus }))} className="rounded-2xl border border-white/45 bg-white/28 px-4 py-3 outline-none backdrop-blur-3xl">
                {VEHICLE_EDITABLE_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
              <div className="rounded-[24px] border border-sky-100/70 bg-sky-50/35 p-4 backdrop-blur-2xl sm:col-span-2">
                <div className="mb-3">
                  <div className="text-sm font-semibold text-slate-900">Индивидуальные интервалы ТО</div>
                  <div className="mt-1 text-xs text-slate-500">Задайте свои интервалы замены именно для этой машины. Эти значения используются в карточке машины и в контроле ТО.</div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <input
                    value={vehicleForm.serviceIntervalDays}
                    onChange={(e) => setVehicleForm((prev) => ({ ...prev, serviceIntervalDays: e.target.value }))}
                    inputMode="numeric"
                    placeholder="Интервал ТО, дн."
                    className="rounded-2xl border border-white/45 bg-white/50 px-4 py-3 outline-none backdrop-blur-3xl placeholder:text-slate-400"
                  />
                  <input
                    value={vehicleForm.serviceIntervalRunHours}
                    onChange={(e) => setVehicleForm((prev) => ({ ...prev, serviceIntervalRunHours: e.target.value }))}
                    inputMode="numeric"
                    placeholder="Интервал ТО, м/ч или км"
                    className="rounded-2xl border border-white/45 bg-white/50 px-4 py-3 outline-none backdrop-blur-3xl placeholder:text-slate-400"
                  />
                  <select
                    value={vehicleForm.serviceRunHoursUnit}
                    onChange={(e) => setVehicleForm((prev) => ({ ...prev, serviceRunHoursUnit: e.target.value as '' | 'м/ч' | 'км' }))}
                    className="rounded-2xl border border-white/45 bg-white/50 px-4 py-3 outline-none backdrop-blur-3xl"
                  >
                    <option value="">Ед. интервала</option>
                    <option value="м/ч">м/ч</option>
                    <option value="км">км</option>
                  </select>
                </div>
              </div>
              <input list="people-list" value={vehicleForm.responsible} onChange={(e) => setVehicleForm((prev) => ({ ...prev, responsible: e.target.value }))} placeholder="Ответственный" className="rounded-2xl border border-white/45 bg-white/28 px-4 py-3 outline-none backdrop-blur-3xl placeholder:text-slate-400 sm:col-span-2" />
              <textarea value={vehicleForm.notes} onChange={(e) => setVehicleForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Примечание" rows={4} className="rounded-2xl border border-white/45 bg-white/28 px-4 py-3 outline-none backdrop-blur-3xl placeholder:text-slate-400 sm:col-span-2" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={saveVehicle} className="rounded-2xl bg-sky-500/90 px-4 py-3 font-medium text-white shadow-[0_12px_28px_rgba(59,130,246,0.28)] transition hover:bg-sky-600/90">{editingVehicleId ? 'Сохранить изменения' : 'Добавить технику'}</button>
              <button onClick={() => closeVehicleModal(reopenVehicleDetailsAfterVehicleModal)} className="rounded-2xl border border-white/60 bg-white/34 px-4 py-3 text-sm font-medium text-slate-700 backdrop-blur-2xl">Отмена</button>
              {editingVehicleId ? (
                <button
                  onClick={() => {
                    if (!window.confirm('Удалить эту технику и связанные движения?')) return
                    removeVehicle(editingVehicleId)
                    closeVehicleModal(false)
                  }}
                  className="rounded-2xl border border-rose-200/70 bg-rose-50/45 px-4 py-3 text-sm font-medium text-rose-700 backdrop-blur-2xl"
                >
                  Удалить
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {isProductModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/12 p-4 backdrop-blur-md">
          <div className={`${glass('w-full max-w-2xl p-5')}`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{editingProductId ? 'Редактирование позиции' : 'Новая позиция'}</h3>
                <p className="mt-1 text-sm text-slate-500">Изменяйте параметры фасовки, минимума и цены.</p>
              </div>
              <button
                onClick={() => {
                  setIsProductModalOpen(false)
                  setEditingProductId(null)
                  setProductForm(emptyProductDraft())
                }}
                className="rounded-2xl border border-white/60 bg-white/34 px-3 py-2 text-sm text-slate-700 backdrop-blur-2xl"
              >
                Закрыть
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={productForm.name} onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Наименование" className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400 sm:col-span-2" />
              <input value={productForm.category} onChange={(e) => setProductForm((prev) => ({ ...prev, category: e.target.value }))} placeholder="Категория" className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400" />
              <select value={productForm.unit} onChange={(e) => setProductForm((prev) => ({ ...prev, unit: e.target.value as Unit }))} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl">
                <option value="">Единица измерения</option>
                <option value="л">л</option>
                <option value="кг">кг</option>
                <option value="шт">шт</option>
              </select>
              <input value={productForm.packSize} onChange={(e) => setProductForm((prev) => ({ ...prev, packSize: e.target.value }))} placeholder="Фасовка" className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400" />
              <input value={productForm.minStock} onChange={(e) => setProductForm((prev) => ({ ...prev, minStock: e.target.value }))} placeholder="Мин. остаток" className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400" />
              <input value={productForm.price} onChange={(e) => setProductForm((prev) => ({ ...prev, price: e.target.value }))} placeholder="Цена" className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400 sm:col-span-2" />
              <textarea value={productForm.notes} onChange={(e) => setProductForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Примечание" rows={4} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400 sm:col-span-2" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={saveProduct} className="rounded-2xl bg-sky-500/90 px-4 py-3 font-medium text-white shadow-[0_12px_28px_rgba(59,130,246,0.28)] transition hover:bg-sky-600/90">{editingProductId ? 'Сохранить изменения' : 'Добавить позицию'}</button>
              <button onClick={() => { setIsProductModalOpen(false); setEditingProductId(null); setProductForm(emptyProductDraft()) }} className="rounded-2xl border border-white/60 bg-white/34 px-4 py-3 text-sm font-medium text-slate-700 backdrop-blur-2xl">Отмена</button>
            </div>
          </div>
        </div>
      ) : null}

      {isContactModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/12 p-4 backdrop-blur-md">
          <div className={`${glass('w-full max-w-xl p-5')}`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{editingContactId ? 'Редактирование контакта' : 'Новый контакт'}</h3>
                <p className="mt-1 text-sm text-slate-500">Справочник используется в техниках, расходах, осмотрах и поставках.</p>
              </div>
              <button
                onClick={() => {
                  setIsContactModalOpen(false)
                  setEditingContactId(null)
                  setContactForm(emptyContactDraft())
                }}
                className="rounded-2xl border border-white/60 bg-white/34 px-3 py-2 text-sm text-slate-700 backdrop-blur-2xl"
              >
                Закрыть
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={contactForm.name} onChange={(e) => setContactForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Имя сотрудника / организация" className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400 sm:col-span-2" />
              <select value={contactForm.kind} onChange={(e) => setContactForm((prev) => ({ ...prev, kind: e.target.value as ContactKind, position: e.target.value === 'supplier' ? '' : prev.position }))} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl">
                <option value="person">Сотрудник</option>
                <option value="supplier">Поставщик</option>
              </select>
              {contactForm.kind === 'person' ? (
                <select
                  value={contactForm.position}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, position: e.target.value }))}
                  className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl"
                >
                  <option value="">Должность</option>
                  {CONTACT_POSITION_OPTIONS.map((position) => (
                    <option key={position} value={position}>{position}</option>
                  ))}
                </select>
              ) : (
                <input value="" readOnly placeholder="Должность" className="rounded-2xl border border-white/40 bg-white/20 px-4 py-3 text-slate-400 outline-none backdrop-blur-2xl" />
              )}
              <input value={contactForm.phone} onChange={(e) => setContactForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="Телефон" className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400" />
              <textarea value={contactForm.note} onChange={(e) => setContactForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Комментарий" rows={4} className="rounded-2xl border border-white/55 bg-white/34 px-4 py-3 outline-none backdrop-blur-2xl placeholder:text-slate-400 sm:col-span-2" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={saveContact} className="rounded-2xl bg-sky-500/90 px-4 py-3 font-medium text-white shadow-[0_12px_28px_rgba(59,130,246,0.28)] transition hover:bg-sky-600/90">{editingContactId ? 'Сохранить изменения' : 'Добавить контакт'}</button>
              <button onClick={() => { setIsContactModalOpen(false); setEditingContactId(null); setContactForm(emptyContactDraft()) }} className="rounded-2xl border border-white/60 bg-white/34 px-4 py-3 text-sm font-medium text-slate-700 backdrop-blur-2xl">Отмена</button>
            </div>
          </div>
        </div>
      ) : null}

      {isVehicleDetailsOpen && selectedVehicle ? (
        <div className="fixed inset-0 z-50 bg-slate-900/14 p-3 backdrop-blur-md sm:p-5">
          <div className={`${glass('mx-auto flex h-[calc(100vh-24px)] w-full max-w-7xl flex-col p-5 sm:h-[calc(100vh-40px)] sm:p-6')}`}>
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-slate-900">{selectedVehicle.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{selectedVehicle.plate || 'Без госномера'} · {selectedVehicle.type} · {selectedVehicle.responsible || 'Ответственный не указан'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setMovementVehicleFilter(selectedVehicle.id)} className="rounded-2xl border border-white/60 bg-white/28 px-3 py-2 text-sm text-slate-700 backdrop-blur-2xl">Фильтр в журнале</button>
                <button onClick={() => { setEditingMovementId(null); setMovementForm((prev) => ({ ...prev, type: 'issue', productId: availableProductsForOutflow[0]?.id ?? '', vehicleId: selectedVehicle.id, counterparty: selectedVehicle.responsible || prev.counterparty, purposeKind: 'ТО', purposeSystem: prev.purposeSystem || 'Двигатель', purpose: composeMovementPurpose('ТО', prev.purposeSystem || 'Двигатель', 'Расход') })); setIssueLines([emptyIssueLine(availableProductsForOutflow[0]?.id ?? '')]); setActiveTab('movements'); setIsVehicleDetailsOpen(false); setIsMovementFormOpen(true); setNotice('Форма расхода открыта для выбранной машины.') }} className="rounded-2xl border border-sky-200/70 bg-sky-50/45 px-3 py-2 text-sm text-sky-700 backdrop-blur-2xl">Добавить расход</button>
                <button onClick={() => editVehicle(selectedVehicle)} className="rounded-2xl border border-sky-200/70 bg-sky-50/55 px-3 py-2 text-sm text-sky-700 backdrop-blur-2xl">Редактировать / интервалы ТО</button>
                <button onClick={() => setIsVehicleDetailsOpen(false)} className="rounded-2xl border border-white/60 bg-white/34 px-3 py-2 text-sm text-slate-700 backdrop-blur-2xl">Закрыть</button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto pr-1">
              <div className="space-y-4">
                <div className="rounded-[26px] border border-slate-200/70 bg-white/60 p-4 backdrop-blur-3xl">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-sm">
                    <div className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl"><div className="text-slate-500">Расход за 30 дней</div><div className="mt-1 font-semibold text-slate-900">{formatNumber(selectedVehicleLast30)} {selectedVehicleIssueUnitLabel}</div></div>
                    <div className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl"><div className="text-slate-500">Предыдущие 30 дней</div><div className="mt-1 font-semibold text-slate-900">{formatNumber(selectedVehiclePrev30)} {selectedVehicleIssueUnitLabel}</div></div>
                    <div className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl"><div className="text-slate-500">Операций расхода</div><div className="mt-1 font-semibold text-slate-900">{selectedVehicleIssues.length} шт.</div></div>
                    <div className={`rounded-2xl p-3 backdrop-blur-2xl ${selectedVehicleAnomaly ? 'bg-rose-50/45 text-rose-800' : 'bg-emerald-50/45 text-emerald-800'}`}><div className="text-current/70">Сигнал</div><div className="mt-1 font-semibold">{selectedVehicleAnomaly ? 'Нужна проверка' : 'Расход без явных отклонений'}</div></div>
                  </div>
                  <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                    <div>
                      <h3 className="font-semibold text-slate-900">Нормы и следующее ТО</h3>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 text-sm">
                        <div className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl"><div className="text-slate-500">Интервал ТО</div><div className="mt-1 font-semibold text-slate-900">{selectedVehicleNorms?.intervalDays ?? '—'} дн.</div></div>
                        <div className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl"><div className="text-slate-500">Индивидуальная норма ТО по моточасам / пробегу</div><div className="mt-1 font-semibold text-slate-900">{selectedVehicleNorms ? `${formatNumber(selectedVehicleNorms.intervalRunHours)}${selectedVehicleNorms.runHoursUnit ? ` ${selectedVehicleNorms.runHoursUnit}` : ''}` : '—'}</div></div>
                        <div className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl"><div className="text-slate-500">Фактический интервал между двумя ТО</div><div className="mt-1 font-semibold text-slate-900">{selectedVehicleNextTo?.actualIntervalRunHours !== null && selectedVehicleNextTo?.actualIntervalRunHours !== undefined ? `${formatNumber(selectedVehicleNextTo.actualIntervalRunHours)}${selectedVehicleNextTo.runHoursUnit ? ` ${selectedVehicleNextTo.runHoursUnit}` : ''}` : 'Нет данных'}</div></div>
                        <div className={`rounded-2xl p-3 backdrop-blur-2xl ${selectedVehicleNextTo?.state === 'overdue' ? 'bg-rose-50/45 text-rose-800' : selectedVehicleNextTo?.state === 'soon' ? 'bg-amber-50/45 text-amber-800' : 'bg-emerald-50/45 text-emerald-800'}`}><div className="text-current/70">Следующее ТО</div><div className="mt-1 font-semibold">{selectedVehicleNextTo?.nextDate || 'Нет расчета'}</div></div>
                        <div className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl"><div className="text-slate-500">Последнее ТО</div><div className="mt-1 font-semibold text-slate-900">{selectedVehicleNextTo?.lastToDate || 'Нет данных'}</div></div>
                        <div className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl"><div className="text-slate-500">Последние моточасы / пробег</div><div className="mt-1 font-semibold text-slate-900">{selectedVehicleNextTo?.currentRunHours !== null && selectedVehicleNextTo?.currentRunHours !== undefined ? `${formatNumber(selectedVehicleNextTo.currentRunHours)}${selectedVehicleNextTo.runHoursUnit ? ` ${selectedVehicleNextTo.runHoursUnit}` : ''}` : 'Нет данных'}</div></div>
                        <div className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl"><div className="text-slate-500">Осталось до следующего ТО</div><div className="mt-1 font-semibold text-slate-900">{selectedVehicleNextTo?.remainRunHours !== null && selectedVehicleNextTo?.remainRunHours !== undefined ? `${formatNumber(selectedVehicleNextTo.remainRunHours)}${selectedVehicleNextTo.runHoursUnit ? ` ${selectedVehicleNextTo.runHoursUnit}` : ''}` : 'Нет расчета'}</div></div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Вероятные причины неисправности</h3>
                      <div className="mt-3 space-y-2">
                        {selectedVehicleLikelyIssues.length === 0 ? (
                          <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-3 text-sm text-slate-500">Система не видит явных признаков неисправности по текущей истории расхода.</div>
                        ) : (
                          selectedVehicleLikelyIssues.map((issue) => (
                            <div key={issue.title} className={`rounded-2xl border p-3 text-sm backdrop-blur-2xl ${issue.severity === 'critical' ? 'border-rose-200/70 bg-rose-50/40 text-rose-900' : issue.severity === 'warning' ? 'border-amber-200/70 bg-amber-50/40 text-amber-900' : 'border-sky-200/70 bg-sky-50/40 text-sky-900'}`}>
                              <div className="font-semibold">{issue.title}</div>
                              <div className="mt-1 text-current/80">{issue.detail}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[26px] border border-slate-200/70 bg-white/60 p-4 backdrop-blur-3xl">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">Сводка по маслам</h3>
                      <span className="text-sm text-slate-500">{selectedVehicleSummary.length} поз.</span>
                    </div>
                    <div className="space-y-2">
                      {selectedVehicleSummary.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-3 text-sm text-slate-500">По этой машине пока нет выдач.</div>
                      ) : (
                        selectedVehicleSummary.slice(0, 12).map((item) => {
                          const isExpanded = expandedVehicleProductId === item.product.id
                          return (
                            <div key={item.product.id} className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl">
                              <button
                                type="button"
                                onClick={() => setExpandedVehicleProductId((prev) => (prev === item.product.id ? null : item.product.id))}
                                className="flex w-full items-start justify-between gap-3 text-left"
                              >
                                <div>
                                  <div className="font-medium text-slate-900">{item.product.name}</div>
                                  <div className="mt-1 text-xs text-slate-500">Операций: {item.operations} · Последняя выдача: {item.lastDate}</div>
                                  <div className="mt-2 text-xs text-sky-700">{isExpanded ? 'Скрыть историю выдач' : 'Показать, когда и на что выдавалось'}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-semibold text-slate-900">{formatNumber(item.total)} {item.product.unit}</div>
                                  <div className="mt-2 text-xs text-slate-400">{isExpanded ? '−' : '+'}</div>
                                </div>
                              </button>

                              {isExpanded ? (
                                <div className="mt-3 space-y-2 rounded-2xl border border-slate-200/60 bg-sky-50/60 p-3 backdrop-blur-2xl">
                                  {expandedVehicleProduct && expandedVehicleProductMovements.length > 0 ? (
                                    expandedVehicleProductMovements.map((movement) => (
                                      <div key={movement.id} className="rounded-2xl border border-slate-200/60 bg-white/88 p-3">
                                        <div className="flex items-start justify-between gap-3">
                                          <div>
                                            <div className="font-medium text-slate-900">{movement.purpose || 'Расход масла'}</div>
                                            <div className="mt-1 text-xs text-slate-500">{movement.date} · {movement.counterparty || 'Получатель не указан'}</div>
                                            {movement.runHours ? <div className="mt-1 text-xs text-slate-500">Пробег / моточасы: {movement.runHours}</div> : null}
                                            {movement.documentNo ? <div className="mt-1 text-xs text-slate-500">Документ: {movement.documentNo}</div> : null}
                                            {movement.note ? <div className="mt-1 text-xs text-slate-500">{movement.note}</div> : null}
                                          </div>
                                          <div className="text-right text-sm font-semibold text-slate-900">{formatNumber(Math.abs(movement.quantity))} {expandedVehicleProduct.unit}</div>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="rounded-2xl border border-slate-200/60 bg-white/84 p-3 text-sm text-slate-500">История по этому маслу пока не найдена.</div>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  <div className="rounded-[26px] border border-slate-200/70 bg-white/60 p-4 backdrop-blur-3xl">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">По системам</h3>
                      <span className="text-sm text-slate-500">{selectedVehicleSystemStats.length}</span>
                    </div>
                    <div className="space-y-2">
                      {selectedVehicleSystemStats.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-3 text-sm text-slate-500">Система пока не смогла разложить расходы по узлам.</div>
                      ) : (
                        selectedVehicleSystemStats.map((item) => (
                          <div key={item.system} className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-medium text-slate-900">{item.label}</div>
                                <div className="mt-1 text-xs text-slate-500">Всего расхода: {formatNumber(item.total)} л / кг</div>
                              </div>
                              <div className="text-right text-sm text-slate-700">
                                <div>Доливов: <span className="font-semibold text-slate-900">{item.topUps} шт.</span></div>
                                <div className="mt-1">Норма долива: <span className="font-semibold text-slate-900">{item.limit > 0 ? `${formatNumber(item.limit)} л / кг` : 'не задана'}</span></div>
                              </div>
                            </div>
                            {item.topUps > 0 ? <div className="mt-2 text-xs text-slate-600">Сумма доливов: {formatNumber(item.topUpQty)} л / кг · максимальный долив: {formatNumber(item.maxTopUp)} л / кг</div> : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-[26px] border border-slate-200/70 bg-white/60 p-4 backdrop-blur-3xl">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">По типам работ</h3>
                      <span className="text-sm text-slate-500">{selectedVehiclePurposeSummary.length}</span>
                    </div>
                    <div className="space-y-2">
                      {selectedVehiclePurposeSummary.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-3 text-sm text-slate-500">Типы работ пока не зафиксированы.</div>
                      ) : (
                        selectedVehiclePurposeSummary.slice(0, 12).map((item) => {
                          const isExpanded = expandedVehiclePurpose === item.purpose
                          return (
                            <div key={item.purpose} className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl">
                              <button
                                type="button"
                                onClick={() => setExpandedVehiclePurpose((prev) => (prev === item.purpose ? null : item.purpose))}
                                className="flex w-full items-center justify-between gap-3 text-left"
                              >
                                <div>
                                  <div className="font-medium text-slate-900">{item.purpose}</div>
                                  <div className="mt-1 text-xs text-sky-700">{isExpanded ? 'Скрыть историю расходов' : 'Показать, когда и что расходовалось'}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-semibold text-slate-900">{formatNumber(item.total)}</div>
                                  <div className="mt-2 text-xs text-slate-400">{isExpanded ? '−' : '+'}</div>
                                </div>
                              </button>
                              {isExpanded ? (
                                <div className="mt-3 space-y-2 rounded-2xl border border-slate-200/60 bg-sky-50/60 p-3 backdrop-blur-2xl">
                                  {expandedVehiclePurposeMovements.map((movement) => (
                                    <div key={movement.id} className="rounded-2xl border border-slate-200/60 bg-white/88 p-3">
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <div className="font-medium text-slate-900">{productMap.get(movement.productId)?.name ?? '—'}</div>
                                          <div className="mt-1 text-xs text-slate-500">{movement.date} · {movement.counterparty || 'Получатель не указан'}</div>
                                          {movement.runHours ? <div className="mt-1 text-xs text-slate-500">Пробег / моточасы: {movement.runHours}</div> : null}
                                          {movement.note ? <div className="mt-1 text-xs text-slate-500">{movement.note}</div> : null}
                                        </div>
                                        <div className="text-right text-sm font-semibold text-slate-900">{formatNumber(Math.abs(movement.quantity))}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                  <div className="rounded-[26px] border border-slate-200/70 bg-white/60 p-4 backdrop-blur-3xl">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">Последние операции</h3>
                      <span className="text-sm text-slate-500">{selectedVehicleMovements.length}</span>
                    </div>
                    <div className="space-y-2">
                      {selectedVehicleMovements.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-3 text-sm text-slate-500">Операций по этой машине пока нет.</div>
                      ) : (
                        selectedVehicleMovements.slice(0, 16).map((movement) => {
                          const unit = productMap.get(movement.productId)?.unit ?? ''
                          const operationLabel = movement.type === 'receipt' ? 'Приход' : movement.type === 'issue' ? 'Расход' : 'Корректировка'
                          const productName = productMap.get(movement.productId)?.name ?? '—'

                          return (
                            <div key={movement.id} className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-medium text-slate-900">{operationLabel}: {formatNumber(movement.quantity)} {unit}</div>
                                  <div className="mt-1 text-xs text-slate-700">Масло: {productName}</div>
                                  <div className="mt-1 text-xs text-slate-500">{movement.date} · {movement.purpose || operationLabel}</div>
                                  {movement.note ? <div className="mt-1 text-xs text-slate-500">{movement.note}</div> : null}
                                </div>
                                <div className={`rounded-full px-3 py-1 text-xs font-medium ${movement.type === 'issue' ? 'bg-rose-100/80 text-rose-700' : movement.type === 'receipt' ? 'bg-emerald-100/80 text-emerald-700' : 'bg-amber-100/80 text-amber-700'}`}>
                                  {movement.type === 'issue' ? '−' : movement.type === 'receipt' ? '+' : '±'}{formatNumber(movement.quantity)} {unit}
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  <div className="rounded-[26px] border border-slate-200/70 bg-white/60 p-4 backdrop-blur-3xl">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">Осмотры и ремонт</h3>
                        <p className="mt-1 text-xs text-slate-500">Журнал решений механика по выбранной машине.</p>
                      </div>
                      <button onClick={() => openInspectionForVehicle(selectedVehicle.id, selectedVehicleAnomaly ? 'inspection' : 'observation')} className="rounded-2xl border border-sky-200/70 bg-sky-50/45 px-3 py-2 text-sm text-sky-700 backdrop-blur-2xl">Добавить запись</button>
                    </div>

                    <div className="rounded-2xl border border-slate-200/60 bg-white/84 p-3 backdrop-blur-2xl">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input type="date" value={inspectionForm.date} onChange={(e) => setInspectionForm((prev) => ({ ...prev, date: e.target.value }))} className="rounded-2xl border border-white/45 bg-white/28 px-4 py-3 outline-none backdrop-blur-3xl" />
                        <select value={inspectionForm.stage} onChange={(e) => setInspectionForm((prev) => ({ ...prev, stage: e.target.value as InspectionStage }))} className="rounded-2xl border border-white/45 bg-white/28 px-4 py-3 outline-none backdrop-blur-3xl">
                          {INSPECTION_STAGE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                        <input list="people-list" value={inspectionForm.mechanic} onChange={(e) => setInspectionForm((prev) => ({ ...prev, mechanic: e.target.value }))} placeholder="Механик / ответственный" className="rounded-2xl border border-white/45 bg-white/28 px-4 py-3 outline-none backdrop-blur-3xl sm:col-span-2" />
                        <textarea value={inspectionForm.finding} onChange={(e) => setInspectionForm((prev) => ({ ...prev, finding: e.target.value }))} placeholder="Что обнаружено" rows={3} className="rounded-2xl border border-white/45 bg-white/28 px-4 py-3 outline-none backdrop-blur-3xl sm:col-span-2" />
                        <textarea value={inspectionForm.action} onChange={(e) => setInspectionForm((prev) => ({ ...prev, action: e.target.value }))} placeholder="Что сделано" rows={3} className="rounded-2xl border border-white/45 bg-white/28 px-4 py-3 outline-none backdrop-blur-3xl sm:col-span-2" />
                        <textarea value={inspectionForm.recommendation} onChange={(e) => setInspectionForm((prev) => ({ ...prev, recommendation: e.target.value }))} placeholder="Рекомендация / решение" rows={3} className="rounded-2xl border border-white/45 bg-white/28 px-4 py-3 outline-none backdrop-blur-3xl sm:col-span-2" />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={saveInspectionRecord} className="rounded-2xl bg-sky-500/90 px-4 py-2 text-sm font-medium text-white shadow-[0_12px_28px_rgba(59,130,246,0.28)] transition hover:bg-sky-600/90">Сохранить запись</button>
                        <button onClick={resetInspectionForm} className="rounded-2xl border border-white/60 bg-white/34 px-4 py-2 text-sm font-medium text-slate-700 backdrop-blur-2xl">Очистить</button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {selectedVehicleInspectionHistory.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-3 text-sm text-slate-500">По этой машине пока нет записей осмотров или ремонта.</div>
                      ) : (
                        selectedVehicleInspectionHistory.slice(0, 12).map((record) => (
                          <div key={record.id} className="rounded-2xl border border-slate-200/60 bg-white/82 p-3 backdrop-blur-2xl">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-medium text-slate-900">{INSPECTION_STAGE_OPTIONS.find((item) => item.value === record.stage)?.label}</div>
                                <div className="mt-1 text-xs text-slate-500">{record.date} · {record.mechanic || 'Механик не указан'}</div>
                              </div>
                              <span className="rounded-full bg-sky-100/80 px-3 py-1 text-xs font-medium text-sky-700">{REGISTRY_STATUS_OPTIONS.find((item) => item.value === (record.stage === 'repair' ? 'repair' : record.stage === 'closed' ? 'closed' : 'inspection'))?.label}</span>
                            </div>
                            {record.finding ? <div className="mt-2 text-sm text-slate-700"><span className="font-medium text-slate-900">Обнаружено:</span> {record.finding}</div> : null}
                            {record.action ? <div className="mt-1 text-sm text-slate-700"><span className="font-medium text-slate-900">Сделано:</span> {record.action}</div> : null}
                            {record.recommendation ? <div className="mt-1 text-sm text-slate-700"><span className="font-medium text-slate-900">Решение:</span> {record.recommendation}</div> : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {dashboardStatusModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/18 p-4 backdrop-blur-sm">
          <div className="relative max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-[32px] border border-white/60 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-3xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/50 px-6 py-5">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-sky-600/80">Статус техники</div>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">{VEHICLE_STATUSES.find((item) => item.value === dashboardStatusModal)?.label}</h3>
                <p className="mt-1 text-sm text-slate-500">Машины с этим статусом в текущем реестре.</p>
              </div>
              <button onClick={() => setDashboardStatusModal(null)} className="rounded-2xl border border-white/60 bg-white/45 px-4 py-2 text-sm font-medium text-slate-700 backdrop-blur-2xl">Закрыть</button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
              <div className="space-y-3">
                {dashboardStatusVehicles.length === 0 ? (
                  <div className="rounded-3xl border border-white/60 bg-white/38 p-5 text-sm text-slate-500 shadow-sm backdrop-blur-2xl">По этому статусу пока нет машин.</div>
                ) : (
                  dashboardStatusVehicles.map((vehicle) => (
                    <button
                      key={vehicle.id}
                      onClick={() => {
                        setSelectedVehicleId(vehicle.id)
                        setActiveTab('vehicles')
                        setIsVehicleDetailsOpen(true)
                        setDashboardStatusModal(null)
                      }}
                      className="w-full rounded-3xl border border-white/60 bg-white/40 p-4 text-left shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">{vehicle.name}</div>
                          <div className="mt-1 text-sm text-slate-500">{vehicle.type} · {vehicle.plate || 'Без номера'}</div>
                          <div className="mt-1 text-xs text-slate-400">{vehicle.responsible || 'Ответственный не указан'}</div>
                        </div>
                        <span className="rounded-full bg-sky-100/80 px-3 py-1 text-xs font-medium text-sky-700">Открыть</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <datalist id="recipient-list">
        {allRecipientNames.map((name) => <option key={name} value={name} />)}
      </datalist>
      <datalist id="people-list">
        {peopleNames.map((name) => <option key={name} value={name} />)}
      </datalist>
      <datalist id="supplier-list">
        {supplierNames.map((name) => <option key={name} value={name} />)}
      </datalist>
    </div>
  )
}

export default App
