(function(){
  const ui=(pt,en)=>qrLanguage==='en-US'?en:pt;
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const status=v=>{
    const s=String(v||'').trim(); if(qrLanguage!=='en-US') return s;
    return ({'aberta':'Open','aberto':'Open','em atendimento':'In progress','atendimento':'In progress','aguardando peca':'Waiting for part','concluida':'Completed','realizada':'Completed','pendente':'Pending','cancelada':'Cancelled','cancelado':'Cancelled','ativo':'Active','inativo':'Inactive','sucesso':'SUCCESS'})[norm(s)]||s;
  };
  const yesNo=v=>qrLanguage==='en-US'?(v?'Yes':'No'):(v?'Sim':'Não');
  const reqOpt=v=>qrLanguage==='en-US'?(v?'Required':'Optional'):(v?'Obrigatória':'Opcional');
  const monthTitle=desc=>{
    if(qrLanguage!=='en-US') return String(desc||'');
    const m=String(desc||'').match(/^([A-Za-zÀ-ÿ]+)\/(\d{4})$/); if(!m) return String(desc||'');
    const months={janeiro:'January',fevereiro:'February',marco:'March',abril:'April',maio:'May',junho:'June',julho:'July',agosto:'August',setembro:'September',outubro:'October',novembro:'November',dezembro:'December'};
    return (months[norm(m[1])]||m[1])+'/'+m[2];
  };
  const auditAction=v=>{
    const s=String(v||'').trim(); if(qrLanguage!=='en-US') return s;
    return ({LOGIN_SUCESSO:'LOGIN_SUCCESS',OC_CONCLUIDA:'WORK_ORDER_COMPLETED','OC_CONCLUÍDA':'WORK_ORDER_COMPLETED',DOCUMENTO_ENVIADO:'DOCUMENT_UPLOADED',PRESTADOR_CRIADO:'PROVIDER_CREATED',PRESTADOR_ALTERADO:'PROVIDER_UPDATED',CONFIGURACAO_ALTERADA:'CONFIGURATION_UPDATED',USUARIO_CRIADO:'USER_CREATED',USUARIO_STATUS:'USER_STATUS_CHANGED'})[s]||s;
  };
  const auditType=v=>{
    const s=String(v||'').trim(); if(qrLanguage!=='en-US') return s;
    return ({AUTENTICACAO:'AUTHENTICATION',USUARIO:'USER',PRESTADOR:'SERVICE_PROVIDER',DOCUMENTO_TECNICO:'TECHNICAL_DOCUMENT',OCORRENCIA:'WORK_ORDER',CONFIGURACAO:'CONFIGURATION'})[norm(s).toUpperCase()]||s;
  };

  function globalHeader(){
    const sub=document.getElementById('qrAppSubtitle'); if(sub) sub.textContent=ui('Gestão rápida de manutenção','Quick Maintenance Management');
    if($('installAppButton')) $('installAppButton').textContent=ui('📲 Instalar QRManut no celular','📲 Install QRManut on your phone');
    if($('systemLogoutButton')) $('systemLogoutButton').textContent=ui('Sair do Menu','Sign Out');
    renderSystemAccess();
  }

  renderSystemAccess=function(){
    if(!systemSession){hide('systemAccessInfo');return}
    show('systemAccessInfo');
    $('systemAccessText').innerHTML=`${ui('Acesso','Access')}: <b>${esc(systemSession.nome||systemSession.usuario)}</b> • ${ui('Perfil','Role')}: <b>${esc(systemSession.perfil)}</b>${systemSession.prestador?` • ${ui('Prestador','Service Provider')}: <b>${esc(systemSession.prestador)}</b>`:''}`;
    $('systemLogoutButton').textContent=ui('Sair do Menu','Sign Out');
  };

  searchAssets=async function(){
    let q=$('searchInput').value.trim();
    if(!q){$('searchStatus').textContent=ui('Digite o ID, nome do equipamento, ambiente ou localização que deseja localizar.','Enter the asset ID, equipment name, environment or location you want to find.');focusSearchInput();return}
    if(q.length<2){$('searchStatus').textContent=ui('Digite pelo menos 2 caracteres.','Type at least 2 characters.');focusSearchInput();return}
    if(/^[a-z0-9_-]+$/i.test(q))q=normalizeId(q); $('searchStatus').textContent=ui('Buscando...','Searching...');
    try{
      const d=await menuApi({action:'search',q}),items=d.results||[];
      $('searchStatus').textContent=qrLanguage==='en-US'?`${items.length} ${items.length===1?'result':'results'}`:`${items.length} resultado(s)`;
      $('searchResults').innerHTML=items.map(item=>`<div class="search-result"><div class="search-result-id">${esc(item.id)}</div><div class="search-result-name">${esc(item.nome)}</div><div class="search-result-data">${item.pavimento?`<div><b>${ui('Pavimento','Floor')}:</b> ${esc(item.pavimento)}</div>`:''}${item.localizacao?`<div><b>${ui('Localização','Location')}:</b> ${esc(item.localizacao)}</div>`:''}${item.prestador?`<div><b>${ui('Prestador','Service Provider')}:</b> ${esc(item.prestador)}</div>`:''}${item.periodicidade?`<div><b>${ui('Periodicidade','Frequency')}:</b> ${esc(item.periodicidade)}</div>`:''}</div><a class="open-button" href="?id=${encodeURIComponent(normalizeId(item.id))}">${ui('Abrir ficha','Open record')}</a></div>`).join('');
    }catch(e){$('searchStatus').textContent=ui('Erro ao realizar busca.','Search failed.')}
  };

  loadPending=async function(){
    const btn=$('pendingApplyFilters');btn.disabled=true;btn.textContent=ui('Consultando...','Searching...');$('pendingStatusText').textContent=ui('Consultando OCs pendentes...','Loading pending work orders...');
    try{
      const r=await menuApi({action:'pending',prestador:$('pendingProvider').value,status:$('pendingStatus').value,categoria:$('pendingCategory').value,pavimento:$('pendingFloor').value,localizacao:$('pendingLocation').value});
      if(!r.ok)throw new Error(r.detail||ui('Erro ao consultar OCs pendentes.','Unable to load pending work orders.'));
      const items=r.occurrences||[],s=r.summary||{};
      $('pendingStatusText').textContent=qrLanguage==='en-US'?`${items.length} work order(s) found with the applied filters.`:`${items.length} OC(s) encontrada(s) com os filtros aplicados.`;
      $('pendingSummary').innerHTML=`<div class="pending-summary-card"><strong>${s.total||items.length}</strong>${ui('Total','Total')}</div><div class="pending-summary-card"><strong>🔴 ${s.abertas||0}</strong>${ui('Abertas','Open')}</div><div class="pending-summary-card"><strong>🟡 ${s.atendimento||0}</strong>${ui('Atendimento','In progress')}</div><div class="pending-summary-card"><strong>🟠 ${s.aguardandoPeca||0}</strong>${ui('Aguardando peça','Waiting for part')}</div>`;
      if(!items.length){$('pendingResults').innerHTML=`<div class="document-empty">${ui('Nenhuma OC pendente encontrada para os filtros informados.','No pending work orders found for the selected filters.')}</div>`;return}
      $('pendingResults').innerHTML=items.map(item=>`<div class="pending-card"><b>${esc(item.ocorrencia)}</b><div>${esc(item.id)} – ${esc(item.nome)}</div><div class="search-result-data"><b>Status:</b> ${esc(status(item.status))}${item.prestador?`<br><b>${ui('Prestador','Service Provider')}:</b> ${esc(item.prestador)}`:''}${item.categoriaOcorrencia?`<br><b>${ui('Categoria','Category')}:</b> ${esc(item.categoriaOcorrencia)}`:''}${item.pavimento?`<br><b>${ui('Pavimento','Floor')}:</b> ${esc(item.pavimento)}`:''}${item.localizacao?`<br><b>${ui('Localização','Location')}:</b> ${esc(item.localizacao)}`:''}<br><b>${ui('Descrição','Description')}:</b> ${esc(item.descricao)}</div><a class="open-button" href="?id=${encodeURIComponent(normalizeId(item.id))}">${ui('Abrir ficha','Open record')}</a></div>`).join('');
    }catch(e){$('pendingResults').innerHTML='';$('pendingStatusText').textContent=e.message||ui('Erro ao consultar OCs pendentes.','Unable to load pending work orders.')}
    finally{btn.disabled=false;btn.textContent=ui('Aplicar filtros','Apply Filters')}
  };
  renderOccurrenceReport=function(){
    const d=occurrenceReportData;if(!d)return;const s=d.summary||{};
    $('occReportStatus').textContent=qrLanguage==='en-US'?`${s.total||0} work order(s) completed in the period ${d.periodo?.descricao||''}`:`${s.total||0} OC(s) concluída(s) no período ${d.periodo?.descricao||''}`;
    $('occReportSummary').innerHTML=`<div class="occ-report-summary-card"><strong>${s.total||0}</strong>${ui('OCs concluídas','Completed work orders')}</div><div class="occ-report-summary-card"><strong>${esc(formatDurationHours(s.tempoMedioHoras))}</strong>${ui('Tempo médio','Average time')}</div><div class="occ-report-summary-card"><strong>${s.categorias||0}</strong>${ui('Categorias','Categories')}</div><div class="occ-report-summary-card"><strong>${s.prestadores||0}</strong>${ui('Prestadores','Service providers')}</div>`;
    $('occCategorySummary').innerHTML=(d.categorias||[]).map(x=>`<span class="occ-category-chip">${esc(x.nome)}: ${x.total}</span>`).join('');
    const items=d.ocorrencias||[];
    if(!items.length){$('occReportResults').innerHTML=`<div class="document-empty">${ui('Nenhuma OC concluída encontrada para o período e filtros informados.','No completed work orders found for the selected period and filters.')}</div>`;$('occReportPdf').disabled=true;return}
    $('occReportPdf').disabled=false;
    $('occReportResults').innerHTML=items.map(item=>`<div class="occ-report-card"><div class="occ-report-head"><div><b>${esc(item.ocorrencia)}</b><div>${esc(item.id)} – ${esc(item.equipamento)}</div></div><span class="control-status done">✅ ${ui('Concluída','Completed')}</span></div><div class="occ-report-meta"><b>${ui('Abertura','Opened')}:</b> ${esc(formatDate(item.dataAbertura))}<br><b>${ui('Conclusão','Completed')}:</b> ${esc(formatDate(item.dataConclusao))}<br><b>${ui('Tempo até a conclusão','Time to completion')}:</b> ${esc(formatDurationHours(item.tempoHoras))}<br>${item.prestador?`<b>${ui('Prestador','Service Provider')}:</b> ${esc(item.prestador)}<br>`:''}${item.pavimento?`<b>${ui('Pavimento','Floor')}:</b> ${esc(item.pavimento)}<br>`:''}${item.localizacao?`<b>${ui('Localização','Location')}:</b> ${esc(item.localizacao)}<br>`:''}${item.categoria?`<b>${ui('Categoria','Category')}:</b> ${esc(item.categoria)}<br>`:''}${item.componente?`<b>${ui('Componente','Component')}:</b> ${esc(item.componente)}<br>`:''}${item.responsavel?`<b>${ui('Responsável','Responsible')}:</b> ${esc(item.responsavel)}<br>`:''}${item.descricao?`<br><b>${ui('Descrição','Description')}:</b><br>${esc(item.descricao)}<br>`:''}${item.solucao?`<br><b>${ui('Solução','Solution')}:</b><br>${esc(item.solucao)}`:''}</div><div class="occ-report-links">${item.fotoAbertura?`<a href="${esc(item.fotoAbertura)}" target="_blank" rel="noopener">📷 ${ui('Foto da abertura','Opening photo')}</a>`:''}${item.fotoConclusao?`<a href="${esc(item.fotoConclusao)}" target="_blank" rel="noopener">📷 ${ui('Foto da conclusão','Completion photo')}</a>`:''}</div><a class="open-button" href="?id=${encodeURIComponent(normalizeId(item.id))}">${ui('Abrir ficha','Open record')}</a></div>`).join('');
  };

  renderPreventiveControl=function(){
    const d=preventiveControlData,s=d.summary;
    $('preventiveLoggedInfo').innerHTML=`${ui('Acesso','Access')}: <b>${esc(systemSession.usuario)}</b> • ${ui('Perfil','Role')}: <b>${esc(systemSession.perfil)}</b> • ${ui('Prestador','Service Provider')}: <b>${esc(systemSession.prestador)}</b>`;
    $('controlTitle').textContent=qrLanguage==='en-US'?'Preventive Maintenance – '+monthTitle(d.competenciaDescricao):'Preventivas – '+d.competenciaDescricao;
    $('controlSummary').innerHTML=`<div class="control-summary-card"><strong>${s.previstas}</strong>${ui('Previstas','Planned')}</div><div class="control-summary-card"><strong>✅ ${s.realizadas}</strong>${ui('Realizadas','Completed')}</div><div class="control-summary-card"><strong>🔴 ${s.pendentes}</strong>${ui('Pendentes','Pending')}</div><div class="control-summary-card"><strong>${s.percentual}%</strong>${ui('Conclusão','Completion')}</div>`;
    $('progressText').textContent=s.percentual+'%';$('progressFill').style.width=s.percentual+'%';
    const lbl=document.querySelector('#preventiveControlArea .progress-wrap b');if(lbl)lbl.textContent=ui('Conclusão da competência','Period completion');
    if(['MASTER','GESTOR'].includes(systemSession.perfil)){const atual=$('controlProvider').value;if(!atual||$('controlProvider').options.length<=1){$('controlProvider').innerHTML=`<option value="">${ui('Todos os prestadores','All service providers')}</option>`+d.prestadores.map(p=>`<option value="${esc(p.prestador)}">${esc(p.prestador)}</option>`).join('')}$('controlProvider').disabled=false}else{$('controlProvider').innerHTML=`<option value="${esc(systemSession.prestador)}">${esc(systemSession.prestador)}</option>`;$('controlProvider').disabled=true}
    $('providerSummary').innerHTML=d.prestadores.map(p=>`<div class="provider-card"><b>${esc(p.prestador)}</b><br>${ui('Previstas','Planned')}: ${p.previstas} • ${ui('Realizadas','Completed')}: ${p.realizadas} • ${ui('Pendentes','Pending')}: ${p.pendentes} • ${p.percentual}%</div>`).join('');renderControlList();
  };

  renderControlList=function(){
    if(!preventiveControlData)return;
    let items=preventiveControlMode==='pending'?preventiveControlData.pendentes.map(x=>({...x,state:'pending'})):preventiveControlMode==='done'?preventiveControlData.realizadas.map(x=>({...x,state:'done'})):[...preventiveControlData.pendentes.map(x=>({...x,state:'pending'})),...preventiveControlData.realizadas.map(x=>({...x,state:'done'}))];
    $('controlListStatus').textContent=qrLanguage==='en-US'?`${items.length} equipment`:`${items.length} equipamento(s)`;
    $('controlResults').innerHTML=items.map(item=>`<div class="control-item ${item.state}"><div class="control-head"><div><b>${esc(item.id)}</b><div>${esc(item.nome)}</div></div><span class="control-status ${item.state}">${item.state==='done'?'✅ '+ui('Realizada','Completed'):'🔴 '+ui('Pendente','Pending')}</span></div><div class="search-result-data"><b>${ui('Prestador','Service Provider')}:</b> ${esc(item.prestador)}<br><b>${ui('Pavimento','Floor')}:</b> ${esc(item.pavimento)}<br><b>${ui('Localização','Location')}:</b> ${esc(item.localizacao)}${item.observacaoEquipamento?`<br><br><b>${ui('Observação do equipamento','Equipment note')}:</b><br>${esc(item.observacaoEquipamento)}`:''}${item.ultimoRegistro?`<br><br><b>${ui('Executada','Completed on')}:</b> ${esc(formatDate(item.ultimoRegistro.data))}<br><b>${ui('Responsável','Responsible')}:</b> ${esc(item.ultimoRegistro.responsavel)}${item.ultimoRegistro.observacao?`<br><b>${ui('Observação da preventiva','Preventive maintenance note')}:</b> ${esc(item.ultimoRegistro.observacao)}`:''}`:''}</div><a class="open-button" href="?id=${encodeURIComponent(normalizeId(item.id))}">${ui('Abrir ficha','Open record')}</a></div>`).join('');
  };
  searchDocuments=async function(){
    $('documentStatus').textContent=ui('Buscando documentos...','Searching documents...');$('documentResults').innerHTML='';
    try{
      const r=await menuApi({action:'documents',q:$('documentSearchInput').value.trim(),tipo:$('documentTypeFilter').value,disciplina:$('documentDisciplineFilter').value,pavimento:$('documentFloorFilter').value});
      if(!r.ok)throw new Error(r.detail||ui('Erro ao buscar documentos.','Unable to search documents.'));
      const items=r.documents||[];$('documentStatus').textContent=qrLanguage==='en-US'?`${items.length} document(s) found`:`${items.length} documento(s) encontrado(s)`;
      if(!items.length){$('documentResults').innerHTML=`<div class="document-empty">${ui('Nenhum documento encontrado para os filtros informados.','No documents found for the selected filters.')}</div>`;return}
      $('documentResults').innerHTML=items.map(d=>`<div class="document-card"><div class="document-title">📄 ${esc(d.titulo)}</div><div class="document-meta">${d.idDocumento?`<b>ID:</b> ${esc(d.idDocumento)}<br>`:''}${d.tipoDocumento?`<b>${ui('Tipo','Type')}:</b> ${esc(d.tipoDocumento)}<br>`:''}${d.disciplina?`<b>${ui('Disciplina','Discipline')}:</b> ${esc(d.disciplina)}<br>`:''}${d.assunto?`<b>${ui('Assunto','Subject')}:</b> ${esc(d.assunto)}<br>`:''}${d.pavimento?`<b>${ui('Pavimento','Floor')}:</b> ${esc(d.pavimento)}<br>`:''}${d.ambiente?`<b>${ui('Ambiente','Environment')}:</b> ${esc(d.ambiente)}<br>`:''}${d.prestador?`<b>${ui('Prestador','Service Provider')}:</b> ${esc(d.prestador)}<br>`:''}${d.idAtivo?`<b>${ui('Ativo','Asset')}:</b> ${esc(d.idAtivo)}<br>`:''}${d.revisao?`<b>${ui('Revisão','Revision')}:</b> ${esc(d.revisao)}<br>`:''}${d.observacoes?`<b>${ui('Observações','Notes')}:</b> ${esc(d.observacoes)}`:''}</div>${d.linkPdf?`<a class="document-open" href="${esc(d.linkPdf)}" target="_blank" rel="noopener">👁️ ${ui('Abrir PDF','Open PDF')}</a>`:''}</div>`).join('');
    }catch(e){$('documentStatus').textContent='';$('documentResults').innerHTML=`<div class="message error" style="display:block">${esc(e.message||ui('Erro ao buscar documentos.','Unable to search documents.'))}</div>`}
  };

  loadUsers=async function(){
    $('usersStatus').textContent=ui('Carregando usuários...','Loading users...');
    try{
      const [u,p]=await Promise.all([menuApi({action:'users'}),menuApi({action:'providers'})]);if(!u.ok)throw new Error(u.detail||ui('Erro ao carregar usuários.','Unable to load users.'));
      const prov=p.providers||[];$('userProvider').innerHTML=`<option value="">${ui('Vínculo interno / sem prestador','Internal account / no provider')}</option>`+prov.map(x=>`<option value="${esc(x.idPrestador)}">${esc(x.nomeFantasia||x.nome)}</option>`).join('');
      const items=u.users||[];$('usersStatus').textContent=qrLanguage==='en-US'?`${items.length} user(s)`:`${items.length} usuário(s)`;
      $('usersList').innerHTML=items.map(x=>`<div class="user-card"><b>${esc(x.nome)}</b><div class="search-result-data"><b>ID:</b> ${esc(x.idUsuario)}<br><b>Login:</b> ${esc(x.usuario)}<br><b>E-mail:</b> ${esc(x.email||'-')}<br><b>${ui('Perfil','Role')}:</b> ${esc(x.perfil)}${x.prestador?`<br><b>${ui('Prestador','Service Provider')}:</b> ${esc(x.prestador)}`:''}<br><b>Status:</b> ${esc(status(x.status))}${x.ultimoLogin?`<br><b>${ui('Último login','Last login')}:</b> ${esc(formatDate(x.ultimoLogin))}`:''}</div><div class="user-actions">${x.status!=='Inativo'?`<button class="btn btn-secondary" onclick="resendInviteUser('${esc(x.idUsuario)}')">${ui('Reenviar convite','Resend invite')}</button><button class="btn" onclick="setUserStatus('${esc(x.idUsuario)}','Inativo')">${ui('Inativar','Deactivate')}</button>`:`<button class="btn btn-green" onclick="setUserStatus('${esc(x.idUsuario)}','Ativo')">${ui('Reativar','Reactivate')}</button>`}</div></div>`).join('');
    }catch(e){$('usersStatus').textContent=e.message}
  };

  loadAudit=async function(){
    const b=$('auditRefresh');b.disabled=true;b.textContent=ui('Consultando...','Searching...');$('auditStatus').textContent=ui('Consultando trilha de auditoria...','Loading audit trail...');
    try{
      const r=await menuApi({action:'audit',...auditParams()});if(!r.ok)throw new Error(r.detail||ui('Não foi possível consultar a auditoria.','Unable to load audit records.'));
      const d=r.data||{},items=d.records||[];$('auditStatus').textContent=qrLanguage==='en-US'?`${items.length} record(s) displayed.`:`${items.length} registro(s) exibido(s).`;
      if(!items.length){$('auditResults').innerHTML=`<div class="document-empty">${ui('Nenhum evento encontrado.','No events found.')}</div>`;return}
      $('auditResults').innerHTML=items.map(x=>`<div class="audit-card"><div class="audit-head"><div><b>${esc(auditAction(x.acao))}</b><div class="muted">${esc(formatDate(x.dataHora))}</div></div><span class="audit-result ${auditResultClass(x.resultado)}">${esc(status(x.resultado||'-'))}</span></div><div class="audit-meta">${x.nomeUsuario||x.idUsuario?`<b>${ui('Usuário','User')}:</b> ${esc(x.nomeUsuario||'-')}${x.idUsuario?` (${esc(x.idUsuario)})`:''}<br>`:''}${x.perfil?`<b>${ui('Perfil','Role')}:</b> ${esc(x.perfil)}<br>`:''}${x.tipoRegistro?`<b>${ui('Tipo','Type')}:</b> ${esc(auditType(x.tipoRegistro))}<br>`:''}${x.idRegistro?`<b>${ui('Registro','Record')}:</b> ${esc(x.idRegistro)}<br>`:''}${x.idAtivo?`<b>${ui('Ativo','Asset')}:</b> ${esc(x.idAtivo)}<br>`:''}</div>${x.detalhes?`<div class="audit-detail"><b>${ui('Detalhes','Details')}:</b> ${esc(x.detalhes)}</div>`:''}${x.valorAnterior||x.valorNovo?`<div class="audit-detail">${x.valorAnterior?`<b>${ui('Anterior','Previous')}:</b> ${esc(x.valorAnterior)}<br>`:''}${x.valorNovo?`<b>${ui('Novo','New')}:</b> ${esc(x.valorNovo)}`:''}</div>`:''}</div>`).join('');
    }catch(e){$('auditStatus').textContent=e.message;$('auditResults').innerHTML=''}
    finally{b.disabled=false;b.textContent=ui('Consultar','Search')}
  };

  loadProvidersAdmin=async function(){
    try{
      const r=await menuApi({action:'providersadmin'});if(!r.ok)throw new Error(r.detail||ui('Erro ao carregar.','Unable to load.'));
      providersAdminData=r.providers||[];$('providersAdminStatus').textContent=qrLanguage==='en-US'?`${providersAdminData.length} service provider(s)`:`${providersAdminData.length} prestador(es)`;
      $('providersAdminList').innerHTML=providersAdminData.map((p,i)=>`<div class="provider-admin-card"><b>${esc(p.nomeFantasia||p.nome)}</b><div class="search-result-data"><b>ID:</b> ${esc(p.idPrestador)}<br><b>Status:</b> ${p.ativo?ui('Ativo','Active'):ui('Inativo','Inactive')}<br><b>${ui('Preventiva','Preventive Maintenance')}:</b> ${yesNo(p.podeRegistrarPreventiva)} • <b>${ui('Atender OC','Handle Work Orders')}:</b> ${yesNo(p.podeAtenderOC)}<br><b>${ui('Assinatura','Signature')}:</b> ${reqOpt(p.exigirAssinatura)} • <b>${ui('Foto','Photo')}:</b> ${reqOpt(p.fotoObrigatoria)}<br><b>${ui('Notificar OC','Work Order Notification')}:</b> ${yesNo(p.notificarOC)}${p.emailOC?` • ${esc(p.emailOC)}`:''}<br><b>${ui('Relatório','Report')}:</b> ${yesNo(p.enviarRelatorio)}${p.emailRelatorio?` • ${esc(p.emailRelatorio)}`:''}</div><button class="btn btn-blue" style="margin-top:10px" onclick="openProviderModal(${i})">${ui('Editar','Edit')}</button></div>`).join('');
    }catch(e){$('providersAdminStatus').textContent=e.message}
  };
  function installFilePicker(){
    const input=$('uploadDocumentFile'); if(!input||$('uploadDocumentChooseFile')) return;
    input.classList.add('qr-file-native');
    const wrap=document.createElement('div');wrap.className='qr-file-control';
    wrap.innerHTML=`<button id="uploadDocumentChooseFile" type="button" class="qr-file-button">${ui('Escolher arquivo','Choose file')}</button><span id="uploadDocumentNativeName" class="qr-file-native-name">${ui('Nenhum arquivo escolhido','No file chosen')}</span>`;
    input.insertAdjacentElement('afterend',wrap);
    $('uploadDocumentChooseFile').onclick=()=>input.click();
    input.onchange=()=>{const f=input.files?.[0];$('uploadDocumentNativeName').textContent=f?f.name:ui('Nenhum arquivo escolhido','No file chosen');prepareDocumentUploadFile()};
  }
  function rerender(){
    globalHeader(); installFilePicker();
    if($('uploadDocumentChooseFile'))$('uploadDocumentChooseFile').textContent=ui('Escolher arquivo','Choose file');
    if($('uploadDocumentNativeName')&&!$('uploadDocumentFile')?.files?.length)$('uploadDocumentNativeName').textContent=ui('Nenhum arquivo escolhido','No file chosen');
    if($('uploadDocumentFileName')&&!$('uploadDocumentFile')?.files?.length)$('uploadDocumentFileName').textContent=ui('Nenhum arquivo selecionado.','No file selected.');
    if(occurrenceReportData)renderOccurrenceReport();
    if(preventiveControlData)renderPreventiveControl();
    if($('searchArea')&&!$('searchArea').classList.contains('hidden')&&$('searchInput')?.value.trim())searchAssets();
    if($('pendingArea')&&!$('pendingArea').classList.contains('hidden'))loadPending();
    if($('documentsArea')&&!$('documentsArea').classList.contains('hidden'))searchDocuments();
    if($('usersArea')&&!$('usersArea').classList.contains('hidden'))loadUsers();
    if($('auditArea')&&!$('auditArea').classList.contains('hidden'))loadAudit();
    if($('providersAdminArea')&&!$('providersAdminArea').classList.contains('hidden'))loadProvidersAdmin();
  }
  const oldApply=qrApplyLanguage;
  qrApplyLanguage=function(lang){oldApply(lang);setTimeout(rerender,0)};

  // Rebind controls that captured old function references before this override file loaded.
  if($('searchButton'))$('searchButton').onclick=searchAssets;
  if($('searchInput'))$('searchInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();searchAssets()}};
  if($('pendingApplyFilters'))$('pendingApplyFilters').onclick=loadPending;
  if($('occReportRefresh'))$('occReportRefresh').onclick=loadOccurrenceReport;
  if($('documentSearchButton'))$('documentSearchButton').onclick=searchDocuments;
  if($('documentSearchInput'))$('documentSearchInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();searchDocuments()}};
  ['documentTypeFilter','documentDisciplineFilter','documentFloorFilter'].forEach(id=>{if($(id))$(id).onchange=searchDocuments});
  if($('auditRefresh'))$('auditRefresh').onclick=loadAudit;

  // Bilingual native-file replacement styles.
  const st=document.createElement('style');
  st.textContent='.qr-file-native{position:absolute!important;left:-9999px!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important}.qr-file-control{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:7px}.qr-file-button{border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:9px;padding:9px 12px;font-weight:700;cursor:pointer}.qr-file-native-name{color:#475569;font-size:.9rem}';
  document.head.appendChild(st);
  installFilePicker();rerender();
})();
