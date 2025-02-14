'use strict'

const bookService = require("../../../services/books")
const insights = require('../../../services/insights')
const f29azureService = require("../../../services/f29azure")
const path = require('path');
const translationService = require("../../../services/translation")

async function getTrialMatchesFromFile(req, res) {
	// Guarda doc en el blob de Azure
	let containerName = 'data';
	if (req.files != null) {
		var data1 = await saveBlob('data', req.body.url, req.files.thumbnail);
		if (data1) {
			const filename = path.basename(req.body.url);

			// console.log("SYS: function getTrialMatchesFromFile has been called on a <", filename, ">");
			// console.log("SYS: content of the document has been saved in the blob");

			// console.log("==> <form_recognizer>");

			// var formResult = await bookService.form_recognizer(req.body.userId, req.body.docId, containerName, req.body.url);
			// // ... 26637 more characters ...
			
			// console.log("<getTrialMatchesFromFile> <==");
			// console.log("SYS: formResult:", formResult);

			// console.log("==> <getDetectLanguage>");
			// let detectedLanguage = await translationService.getDetectLanguage(formResult.data);
			// if (detectedLanguage == null) {
			// 	detectedLanguage = 'en'
			// }
            // console.log("SYS: detected language:", detectedLanguage);
			// console.log("<getTrialMatchesFromFile> <==");

			// console.log("==> <extractEvents>");
			// let events = await bookService.extractEvents(formResult.data, detectedLanguage);

			let detectedLanguage = 'es';
			console.log("SYS: detected language:", detectedLanguage);

			let events = {
				conditions: [ 'enfermetat de Wilson' ],// [ 'Malaltia de Wilson', 'distrofia de cons' ],
				otherTerms: [
				//   'CRB1',
				//   'ABCA4',
				//   'heterozigosi',
				//   'patosgènica',
				//   'probablement patosgènica',
				//   'VUS',
				//   'HGVS',
				//   'ACMG',
				//   'OMIM',
				//   'Human Gene Mutation Database (HGMD)',
				//   'GeneTest.org',
				//   'Online Mendelian Inheritance in Man (OMIM)',
				//   'SIFT',
				//   'PolyPhen2',
				//   'MutationTaster',
				//   'CNVs',
				//   'exomeDepth',
				//   'FastQC',
				//   'cutadapt',
				//   'BWA',
				//   'BEDtools',
				//   'Picard',
				//   'SAMtools',
				//   'GATK',
				//   'FreeBayes',
				//   'VarScan',
				//   'SnpEff',
				//   '1000 Genomes',
				//   'dbSnp',
				//   'ExAc',
				//   'clinvar'
				],
				treatments: [
				//   'monitorització tractament',
				//   'Seqüenciació de 6713 gens',
				//   'validació per Sanger',
				//   'analisi de progenitors',
				//   'assessorament genètic'
				],
				locations: [
				//   'Sant Joan de Déu Barcelona · Hospital',
				//   'Esplugues',
				//   'Servei de Medicina Genetica i Molecular Hospital Sant Joan de Déu',
				//   'Pg. Sant Joan de Déu 2, planta 0 08950 .- Esplugues (Barcelona)'
				]
			  }
			  console.log("SYS: events:", events);

			// Translate conditions and treatments to English if needed
			if (detectedLanguage !== 'en' && events) {
				console.log("SYS: translating conditions and treatments to english...");
				for (const field of ['conditions', 'treatments']) {
				if (events[field]?.length > 0) {
					const itemsToTranslate = events[field].map(item => ({ Text: item }));
					const translatedItems = await translationService.getTranslationDictionary2(itemsToTranslate, detectedLanguage);
					events[field] = translatedItems.map(item => item.translations[0].text);
				}
				}
			} else {
				console.log("SYS: no need to translate conditions and treatments to english");
			}

			// ClinicalTrials.gov API Search

			let clinicalTrials = [];
			try {
				clinicalTrials = await bookService.getClinicalTrials(events, detectedLanguage);
				console.log("SYS: clinical trials:", clinicalTrials);
				res.status(200).json({ events, clinicalTrials, language: detectedLanguage });
			} catch (error) {
				console.error("Error retrieving or translating clinical trials:", error);
				res.status(500).json({ message: "Error retrieving or translating clinical trials", error: error.message });
				// check privacy object !!! :todo
				return;
			}
	  
			
		}
	} else {
		insights.error('Error: no files');
		res.status(500).send({ message: `Error: no files` });
	}
}

async function getInclusionExclusionFromCriteria(req, res) {
	try {
	  // Obtenemos text y language del body
	  const { text, language } = req.body;
  
	  if (!text || text.trim().length === 0) {
		return res.status(400).json({ error: "No text to parse or text is empty." });
	  }
  
	  // Si no te pasan 'language', podrías:
	  // 1) Detectar el idioma (p.ej. con tu translationService.getDetectLanguage)
	  // 2) Por simplicidad, asumir "en" si no lo mandan:
	  const detectedLang = language || 'en';
  
	  // Llamada a tu helper en books.js:
	  const structured = await bookService.extractInclusionExclusion(text, detectedLang);
	  
	  // structured = { inclusion: [...], exclusion: [...] }
  
	  return res.status(200).json(structured);
  
	} catch (error) {
	  console.error("Error in getInclusionExclusionFromCriteria:", error);
	  insights.error(error); // si tienes integraciones
	  res.status(500).json({ error: error.message });
	}
  }

async function saveBlob(containerName, url, thumbnail) {
	return new Promise(async function (resolve, reject) {
		// Save file to Blob
		var result = await f29azureService.createBlob(containerName, url, thumbnail.data);
		if (result) {
			resolve(true);
		} else {
			resolve(false);
		}
	});
}

module.exports = {
	getTrialMatchesFromFile,
	getInclusionExclusionFromCriteria
}