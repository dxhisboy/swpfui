function sw64asm(hljs){
  var insts = [
    'class_(st|wr|rd|rd|)', //class inst
    'selldw', //selldw
    'codc_(search|fetch|chaddr|ldmaddr|tag)', //codc
    'sbmd_(start|end|break)', //sbmd
    'jmp',
    'br',
    'dma',
    'wrch',
    'memb',
    'syn[rc]', //syn
    'halt',
    'f?b(eq|ne|lt|le|gt|ge|)(_hint)?', //branch/hint
    '[rw]csr', //csr
    'vmatch',
    'faaw',
    'faal',
    's[48](add|sub)l', //sadd
    'f?cmp(eq|lt|le|ult|ule|un)', //cmp
    'v?s[lr][la]', //shift
    'v?rotl',
    'ct(pop|lz)', //bmi
    'zap(not)?', //zap
    'sext[bh]', //sext
    '[vf]?sel(eq|le|lt)', //sel
    '[vfu]?(add|sub|mul|div|sqrt|ma|ms|nma|nms)[sdlwbh]', //arith
    'v?log(2x.|3r)', //log
    'fcvt(sd|ds|dlr|dl|ls|ld)', //convert
    '[rw]fpcr',
    's[lr]low', //octa shift
    'u?(add|sub)o(_take)?_carry', //octa addsub
    'umulqa',
    'v(ins|ext)[fw]', //ins ext
    '[vf]?(ld|st)(bu|hu|w|l|b|h|s|d)',
    'vld[rc]',
    'ld[ds]e[rc]?', //load put,
    'v?(ld|st)[wlsd]_u[hl]', //ualign wl stld
    '(get|put)[rc]', //regcomm
    'ldih?', //immediate
    'ret|call'
  ].join('|');
  return{
    case_insensitive: true,
    aliases: ['sw64'],
    lexemes: '\\.?' + hljs.IDENT_RE,
    keywords: {
      meta:
        //GNU preprocs
        '.2byte .4byte .align .ascii .asciz .balign .byte .code .data .else .end .endif .endm .endr .equ .err .exitm .extern .global .hword .if .ifdef .ifndef .include .irp .long .macro .rept .req .section .set .skip .space .text .word .ltorg ',
      built_in:
        '$0 $1 $2 $3 $4 $5 $6 $7 $8 $9 $10 $11 $12 $13 $14 $15 ' + // integer registers
        '$16 $17 $18 $19 $20 $21 $22 $23 $24 $25 $26 $27 $28 $29 $30 $31 ' + // integer registers
        'zero at v0 v1 a0 a1 a2 a3 a4 a5 a6 a7 ' + // integer register aliases
        't0 t1 t2 t3 t4 t5 t6 t7 t8 t9 s0 s1 s2 s3 s4 s5 s6 s7 s8 ' + // integer register aliases
        'k0 k1 gp sp fp ra ' + // integer register aliases
        '$f0 $f1 $f2 $f2 $f4 $f5 $f6 $f7 $f8 $f9 $f10 $f11 $f12 $f13 $f14 $f15 ' + // floating-point registers
        '$f16 $f17 $f18 $f19 $f20 $f21 $f22 $f23 $f24 $f25 $f26 $f27 $f28 $f29 $f30 $f31 ' + // floating-point registers
        'Context Random EntryLo0 EntryLo1 Context PageMask Wired EntryHi ' + // Coprocessor 0 registers
        'HWREna BadVAddr Count Compare SR IntCtl SRSCtl SRSMap Cause EPC PRId ' + // Coprocessor 0 registers
        'EBase Config Config1 Config2 Config3 LLAddr Debug DEPC DESAVE CacheErr ' + // Coprocessor 0 registers
        'ECC ErrorEPC TagLo DataLo TagHi DataHi WatchLo WatchHi PerfCtl PerfCnt ' // Coprocessor 0 registers
    },
    contains: [
      {
        className: 'keyword',
        begin: '\\b('+     //mnemonics
	       insts +
               ')',
        end: '\\s'
      },
      hljs.COMMENT('[;#]', '$'),
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.QUOTE_STRING_MODE,
      {
        className: 'string',
        begin: '\'',
        end: '[^\\\\]\'',
        relevance: 0
      },
      {
        className: 'title',
        begin: '\\|', end: '\\|',
        illegal: '\\n',
        relevance: 0
      },
      {
        className: 'number',
        variants: [
          {begin: '0x[0-9a-f]+'}, //hex
          {begin: '\\b-?[0-9a-f]+'}           //bare number
        ],
        relevance: 0
      },
      {
        className: 'symbol',
        variants: [
          {begin: '^\\s*[a-z_\\.\\$][a-z0-9_\\.\\$]+:'}, //GNU MIPS syntax
          {begin: '^\\s*[0-9]+:'}, // numbered local labels
          {begin: '[0-9]+[bf]' },  // number local label reference (backwards, forwards)
	  {begin: '<.*>' }
        ],
        relevance: 0
      }
    ],
    illegal: '\/'
  };
}
