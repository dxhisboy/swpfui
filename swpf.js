var fadeDuration = 1500;
var easeOpt = d3.easeLinear;
var expDigits = 1;
function column_index(frame, col, v){
  var idx = null;
  if (col instanceof Array){
    frame.columns.forEach((label,i) => {
      if (v) console.log(label, col);
      if (label.every((sublabel, j) => sublabel == col[j]))
	idx = i;
    });
  } else {
    frame.columns.forEach((label,i) => {
      if (label == col)
	idx = i;
    });
  }
  return idx;
}

function transform_dbg_frame(frames){
  var as_map_CU = column_index(frames['as_map'], 'CU');
  var as_map_LINE = column_index(frames['as_map'], 'LINE');
  var as_map_ASM_LINE = column_index(frames['as_map'], 'ASM_LINE');
  frames['asm2src'] = {};
  frames['as_map'].data.forEach(row => {
    var asm_line = row[as_map_ASM_LINE];
    frames['asm2src'][asm_line] = [row[as_map_CU], row[as_map_LINE]];
  });
  frames['vma2src'] = {};

  var dbg_CU = column_index(frames['dbg'], 'CU');
  var dbg_VMA = column_index(frames['dbg'], 'VMA');
  var dbg_LINE = column_index(frames['dbg'], 'LINE');
  frames['dbg'].data.forEach(row => {
    var vma = row[dbg_VMA];
    frames['vma2src'][vma] = [row[dbg_CU], row[dbg_LINE]];
  });
}

function split_cu_frame(frames){
  var LOC_CU = column_index(frames['src_cnt'], ['LOC', 'CU']);
  frames['cu_src_idx'] = {};
  frames['src_cnt'].data.forEach((row, i) => {
    var cu = row[LOC_CU];
    if (!(cu in frames['cu_src_idx'])){
      frames['cu_src_idx'][cu] = [];
    }
    frames['cu_src_idx'][cu].push(frames['src_cnt'].index[i]);
  });
  //console.log(frames);
}

function mangle_cu_line(cu, line){
  return cu.replace(/\//g, '_sub_').replace(/\./g, '_dot_') + '_lno_' + line;
}

var active_loc = null;
var unknow_loc = mangle_cu_line('UNKNOWN', 'UNKNOWN');

function toggle_active_loc(loc){
  if (active_loc != null){
    d3.select('#codeview').selectAll('.' + active_loc).classed('focused', false);
  }
  if (loc != unknow_loc){
    active_loc = loc;
    d3.select('#codeview').selectAll('.' + loc).classed('focused', true);
  }
}

var cur_cu = null;
//var cur_view = null;
function switch_cu(cu){
  refresh_code_view(d3.select('#codecnt'), dataframes, cu, selected_counters);
}
var cur_view = null;
var counter_updated = false;
function switch_view(view){
  //if (view != cur_view){
  var el = d3.select('#tab-nav').node();
  var instance = M.Tabs.getInstance(el);
  instance.select(view);
}

function focus_cu_line(cu, line){
  switch_view('codeview');
  if (cu != cur_cu)
    switch_cu(cu);
  //if (cur_view != 'codeview')
  if (typeof(line) == 'number')
    toggle_active_loc(mangle_cu_line(cu, line));
  
}

function scroll_to_focused_asm(which){
  var selection;
  selection = d3.select('#asmcnt')
		.selectAll('.focused')
  var asm_cnt = d3.select('#asmcnt').node();
  var node;
  if (which == 'first'){
    node = selection.node();
  } else if (which == 'next'){
    console.log(node);
    console.log(asm_cnt);
    node = selection.filter((d,i,e) => e[i].offsetTop > asm_cnt.scrollTop + asm_cnt.clientHeight).node();
  } else if (which == 'last'){
    node = selection.filter((d,i,e) => e[i].offsetTop + e[i].clientHeight < asm_cnt.scrollTop).node();
  }
  if (node) {
    console.log(node);
    node.scrollIntoView({inline: 'start', block: 'center'});
    return true;
  }
  return false;
}


function guess_lang(cu_name){
  var suffix = cu_name.split('.').pop().toLowerCase();
  if (suffix in ['c', 'cpp', 'cc'])
    return 'cpp';
  if (suffix in ['f', 'f90', 'f77'])
    return 'fortran';
  if (suffix in ['s'])
    return 'sw64asm';
  return 'cpp';
}
function refresh_code_view(root, frames, cu, counters){
  var code_div = root;
  root.selectAll('div>*')
      .transition(d3.transition()
		    .duration(fadeDuration)
		    .ease(easeOpt))
      .style('opacity', '0')
      .remove();
  if (cu && cu != 'UNKNOWN'){
    cur_cu = cu;
    var LOC_SRC = column_index(frames['src_cnt'], ['LOC', 'SRC']);
    var LOC_CU = column_index(frames['src_cnt'], ['LOC', 'CU']);
    var LOC_LINE = column_index(frames['src_cnt'], ['LOC', 'LINE']);
    hljs.configure({useBR: true});

    src_highlight = frames.src_cnt.data.map(row => hljs.highlight(guess_lang(cu), row[LOC_SRC], true).value);
    
    var CNT_IDX = counters.map(r => column_index(frames['src_cnt'], r));

    var cu_cnt = frames['cu_src_idx'][cu].map(idx => frames['src_cnt'].data[idx]);
    var cnt_max = CNT_IDX.map(idx => cu_cnt.reduce((r,c) => Math.max(r,c[idx]), 0));

    code_table = code_div.append('table').classed('pre-table', true).style('opacity', 0);

    code_table.append('thead')
 	      .append('tr')
 	      .selectAll('th')
 	      .data(['Line Number', 'Source'].concat(counters.map(d => d.join('\n'))))
    	      .enter()
	      .append('th')
	      .text(d => d);


    var rows = code_table.append('tbody')
			 .style('font-family', 'consolas')
			 .selectAll('tr')
			 .data(d => frames['cu_src_idx'][cu])
			 .enter()
			 .append('tr')
			 .attr('class', (d,i)=>{
			   var lineno = frames['src_cnt'].data[d][LOC_LINE];
			   return mangle_cu_line(cu, lineno);
			 })
			 .on('click', (d) => {
			   var lineno = frames['src_cnt'].data[d][LOC_LINE];
			   var dtext = mangle_cu_line(cu, lineno);
			   toggle_active_loc(dtext);
			   //console.log(dtext);
			 })
			 .on('dblclick', (d) => {
			   var lineno = frames['src_cnt'].data[d][LOC_LINE];
			   var dtext = mangle_cu_line(cu, lineno);
			   toggle_active_loc(dtext);
			   scroll_to_focused_asm('first');
			 });
    rows.selectAll('td')
	.data(d => {
	  var lineno = frames['src_cnt'].data[d][LOC_LINE];
	  var src = src_highlight[d];
	  var cnt_data = CNT_IDX.map(i => frames['src_cnt'].data[d][i])
	  return [lineno, src].concat(cnt_data);
	})
	.enter()
	.append('td')
	.html((d,i) => {
	  if (i < 2) return d;
	  return d.toExponential(expDigits).replace('+', '');
	});
    rows.selectAll('td')
	.filter((d,i) => i < 2)
	.classed('code-cell', true);
    rows.selectAll('td')
	.filter((d,i) => i >= 2)
	.classed('cnt-cell', true)
	.append('div')
	.classed('cnt-bar', true)
    	.style('width', (d,i) => d / cnt_max[i] * 40 + 'px');
	//.style('right', (d,i) => (1 - d / cnt_max[i]) * 40 + 10 + '%');
    
    code_table.transition(d3.transition()
			    .duration(fadeDuration)
			    .ease(easeOpt))
	      .delay(fadeDuration)
	      .style('opacity', 1);

  } else {
    root.append('p')
	.text('No source available');
  }
}

function refresh_asm_view(root, frames, counters){
  console.log(counters);
  var asm_frame = frames['asm_cnt'];
  var asm_div = root;

  root.selectAll('div>*')
      .transition(d3.transition()
		    .duration(fadeDuration)
		    .ease(easeOpt))
      .style('opacity', '0')
      .remove();

  //console.log(asm_frame.columns);
  var LOC_INST = column_index(asm_frame, ['LOC', 'INST']);
  var LOC_VMA = column_index(asm_frame, ['LOC', 'VMA']);
  var LOC_TYPE = column_index(asm_frame, ['LOC', 'TYPE']);

  hljs.configure({useBR: true});
  src_highlight = frames.asm_cnt.data.map(row => {
    val = hljs.highlight('sw64asm', row[LOC_INST], true).value
    if (row[LOC_TYPE] == 'S')
      val = val + ':';
    else
      val = '\t' + val;
    val.replace(' ', '&nbsp');
    return val;
  });

  var CNT_IDX = counters.map(r => column_index(asm_frame, r));

  var cnt_max = CNT_IDX.map(idx => asm_frame.data.reduce((r,c) => Math.max(r,c[idx]), 0));
  
  var asm_tab = asm_div.append('table').classed('pre-table', true).style('opacity', '0');
  var asm_hdr = asm_tab.append('thead')
		       .append('tr');
  //console.log(counters);
  asm_hdr.selectAll('th')
	 .data(['Address', 'Instruction'].concat(counters.map(d => d.join('\n'))))
	 .enter()
	 .append('th')
	 .text(d => d);

  var asm_body = asm_tab.append('tbody').style('font-family', 'consolas');
  var asm_rows = asm_body.selectAll('tr')
			 .data(asm_frame.index)
			 .enter()
			 .append('tr')
			 .attr('class', (d,i)=>{
			   var ii = i.toString();
			   if (ii in frames['asm2src'])
			     return mangle_cu_line(frames['asm2src'][ii][0], frames['asm2src'][ii][1]);
			   else
			     return mangle_cu_line('UNKNOWN', 'UNKNOWN');
			 })
			 .on('click', (d) => {
			   var ii = d.toString();
			   var dtext;
			   if (ii in frames['asm2src'])
			     dtext = mangle_cu_line(frames['asm2src'][ii][0], frames['asm2src'][ii][1]);
			   else
			     dtext = mangle_cu_line('UNKNOWN', 'UNKNOWN');
			   toggle_active_loc(dtext);
			 });

  asm_rows.selectAll('td')
	  .data(idx => {
	    var row_data = asm_frame.data[idx];
	    var loc_data = [parseInt(row_data[LOC_VMA]).toString(16), src_highlight[idx]];
	    var cnt_data = CNT_IDX.map(i => row_data[i]);
	    return loc_data.concat(cnt_data);
	  })
	  .enter()
	  .append('td')
  	  .html((d,i) => {
	    if (i < 2) return d;
	    return d.toExponential(expDigits).replace('+', '');
	  });

  asm_rows.selectAll('td')
	  .filter((d,i) => i < 2)
	  .classed('code-cell', true);
  asm_rows.selectAll('td')
	  .filter((d,i) => i >= 2)
	  .classed('cnt-cell', true)
	  .append('div')
	  .classed('cnt-bar', true)
	  .style('width', (d,i) => d / cnt_max[i] * 40 + 'px');

  root.append('div')
      .classed('fixed-action-btn swpf-asm-btn', true)
      .selectAll('a')
      .data([['last', 'keyboard_arrow_up'], ['next', 'keyboard_arrow_down']])
      .enter()
      .append('a')
      .classed('btn-floating btn-large waves-effect', true)
      .append('i')
      .classed('material-icons', true)
      .text(d => d[1])
      .on('click', d => scroll_to_focused_asm(d[0]));

  asm_tab.transition(d3.transition()
		       .duration(fadeDuration)
		       .ease(easeOpt))
	 .delay(fadeDuration)
	 .style('opacity', 1);

}

function refresh_sym_view(root, frames, counters){
  var sym_frame = frames['sym_cnt'];
  var sym_div = root;

  root.selectAll('div>*')
      .transition(d3.transition()
		    .duration(fadeDuration)
		    .ease(easeOpt))
      .style('opacity', '0')
      .remove();

  //console.log(sym_frame.columns);
  var SYM_VMA = column_index(sym_frame, ['SYM', 'VMA']);
  var SYM_NAME = column_index(sym_frame, ['SYM', 'NAME']);

  hljs.configure({useBR: true});

  var CNT_IDX = counters.map(r => column_index(sym_frame, r));

  var cnt_max = CNT_IDX.map(idx => sym_frame.data.reduce((r,c) => Math.max(r,c[idx]), 0));
  
  var sym_tab = sym_div.append('table').classed('pre-table', true).style('opacity', '0');
  var sym_hdr = sym_tab.append('thead')
		       .append('tr');
  //console.log(counters);
  sym_hdr.selectAll('th')
	 .data(['Address', 'Symbol'].concat(counters.map(d => d.join('\n'))))
	 .enter()
	 .append('th')
	 .text(d => d);

  var sym_body = sym_tab.append('tbody').style('font-family', 'consolas');
  var sym_rows = sym_body.selectAll('tr')
			 .data(sym_frame.index)
			 .enter()
			 .append('tr')
			 .on('dblclick', idx => {
			   var vma = sym_frame.data[idx][SYM_VMA];
			   var src = frames.vma2src[vma];
			   console.log(src);
			   if (src){
			     var cu = src[0];
			     var line = src[1];
			     focus_cu_line(cu, line);
			   }
			 });

  sym_rows.selectAll('td')
	  .data(idx => {
	    var row_data = sym_frame.data[idx];
	    var loc_data = [parseInt(row_data[SYM_VMA]).toString(16), row_data[SYM_NAME]];
	    var cnt_data = CNT_IDX.map(i => row_data[i]);
	    return loc_data.concat(cnt_data);
	  })
	  .enter()
	  .append('td')
  	  .html((d,i) => {
	    if (i < 2) return d;
	    return d.toExponential(expDigits).replace('+', '');
	  });

  sym_rows.selectAll('td')
	  .filter((d,i) => i < 2)
	  .classed('code-cell', true);
  sym_rows.selectAll('td')
	  .filter((d,i) => i >= 2)
	  .classed('cnt-cell', true)
	  .append('div')
	  .classed('cnt-bar', true)
  	  .style('width', (d,i) => d / cnt_max[i] * 40 + 'px');

  sym_tab.transition(d3.transition()
		       .duration(fadeDuration)
		       .ease(easeOpt))
	 .delay(fadeDuration)
	 .style('opacity', 1);

}

function init_counters_view(root, frames){
  var asm_frame = frames['asm_cnt'];
  //var cnt_tab = root.append('table').attr('border', 1);
  var cnt_used = {};

  asm_frame.columns.forEach(r => {
    if (r[0] != 'LOC'){
      if (!(r[0] in cnt_used))
	cnt_used[r[0]] = [];
      cnt_used[r[0]].push(r[1]);
    }
  });

  for (var p in cnt_used){
    cnt_used[p].sort((a,b) => {
      if (a == b) return 0;
      var ia = parseInt(a);
      var ib = parseInt(b);
      if (isNaN(ia) && isNaN(ib))
	return a > b;
      if (isNaN(ib) || ia > ib)
	return 1;
      else
	return -1;
    });
  }
  var cnt_ul = root.append('ul').classed('collapsible', true);
  
  var cnt_li = cnt_ul.selectAll('li')
		     .data(Object.keys(cnt_used))
		     .enter()
		     .append('li');
  cnt_li.append('div')
	.classed('collapsible-header', true)
	.text(d => d);
  var cnt_body = cnt_li.append('div')
		       .classed('collapsible-body', true)
		       .append('div')
		       .classed('container', true);
  var cnt_row = cnt_body.append('div').classed('row', true);
  var cnt_labels = cnt_row.selectAll('label')
			  .data(d => cnt_used[d].map(s => ({event: d, src: s})))
			  .enter()
			  .append('label')
			  .classed('col s1', true);
  cnt_labels.append('input')
	    .attr('type', 'checkbox')
	    .classed('fill-in', true)
	    .on('change', (d, i, e) => {
	      if (e[i].checked){
		selected_counters.push([d.event, d.src]);
	      } else {
		selected_counters = selected_counters.filter(c => c[0] != d.event || c[1] != d.src);
	      }
	      counter_updated = true;
	    });
  cnt_labels.append('span')
	    .text(d => d.src);

  M.Collapsible.init(cnt_ul.node());
}

function init_src_view(root, frames){
  var dir_list = root.append('ul').style('opacity', 0).classed('collapsible', true);
  var src_map = {};
  Object.keys(frames['cu_src_idx']).forEach(
    path => {
      path_split = path.split('/');
      var basename = path_split.pop();
      var dirname = path_split.join('/');
      if (!(dirname in src_map))
	src_map[dirname] = [];
      src_map[dirname].push(basename);
    }
  );

  var dir_lis = dir_list.selectAll('li')
			.data(Object.keys(src_map))
			.enter()
			.append('li');
  dir_lis.append('div')
	 .classed('collapsible-header', true)
	 .text(d => d);

  dir_lis.append('div')
	 .classed('collapsible-body', true)
	 .append('ul')
	 .classed('collection', true)
	 .selectAll('li')
	 .data(d => src_map[d].map(f => {return {'dir': d, 'file': f};}))
	 .enter()
	 .append('a')
	 .classed('collection-item', true)
	 .on('click', d=> {
	   cu = d.dir + '/' + d.file;
	   focus_cu_line(cu);
	   d3.event.stopPropagation();
	 })
	 .text(d => d.file);
  M.Collapsible.init(dir_list.node());
  dir_list.transition(d3.transition()
		       .duration(fadeDuration)
		       .ease(easeOpt))
	 .delay(fadeDuration)
	 .style('opacity', 1);
  console.log(dir_list.node());
}
function init_navigator(root){
  console.log(root);
  root.selectAll('li')
      .data(['codeview', 'counterview', 'funcview', 'srcview'])
      .enter()
      .append('li')
      .classed('tab', true)
      .append('a')
      .attr('href', d => '#' + d)
      .attr('id', d => 'tab-a-' + d)
      .text(d => d);
  M.Tabs.init(root.node(),
	      {
		duration: 200,
		onShow: v => {
		  d3.select(v).selectAll('.swpfwrapper').style('display', 'none');
		  console.log(cur_view);
		  if (cur_view == 'counterview' && counter_updated){
		    refresh_code_view(d3.select('#codecnt'), dataframes, cur_cu, selected_counters);
		    refresh_asm_view(d3.select('#asmcnt'), dataframes, selected_counters);
		    refresh_sym_view(d3.select('#symcnt'), dataframes, selected_counters);
		  }
		  cur_view = v.id;
		  if (cur_view == 'counterview'){
		    counter_updated = false;
		  }
		  setTimeout(e => {
		    d3.select(v).selectAll('.swpfwrapper').style('display', 'block');
		  }, 400);
		}
	      });
}


