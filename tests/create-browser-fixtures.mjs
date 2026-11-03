import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {PDFDocument,StandardFonts} from 'pdf-lib';
import {Document,Packer,Paragraph} from 'docx';
import Excel from 'exceljs';

const directory=resolve(process.argv[2]);await mkdir(directory,{recursive:true});
const pdf=await PDFDocument.create();const page=pdf.addPage();const font=await pdf.embedFont(StandardFonts.Helvetica);
['Name: Test PDF Reader','Age: 21','Birthday: 11 June','Lives in: Abuja'].forEach((text,i)=>page.drawText(text,{x:45,y:760-i*25,size:12,font}));
await writeFile(join(directory,'test-people.pdf'),await pdf.save());
await writeFile(join(directory,'test-people.docx'),await Packer.toBuffer(new Document({sections:[{children:['Name: Test Word Reader','Age: 22','Birthday: 15 October'].map(text=>new Paragraph(text))}]})));
const wb=new Excel.Workbook();const ws=wb.addWorksheet('Contacts');ws.addRows([['Display name','Name','Age','Birthday','Favourite food'],['Test Spreadsheet','Original Name','21','11/06/2008','rice']]);
await writeFile(join(directory,'test-people.xlsx'),await wb.xlsx.writeBuffer());
await writeFile(join(directory,'test-people.csv'),'Name,Age,Birthday,Favourite food\nTest CSV Reader,23,15 October,rice\n');
await writeFile(join(directory,'test-people.json'),JSON.stringify([{name:'Test JSON Reader',fields:{birthday:'maybe 15 June',constructor:'custom detail'},notes:'Fictional test note.'}]));
await writeFile(join(directory,'test-people.txt'),'Name: Test Text Reader\nAge: 24\nLives in: Abuja\n');
console.log('Created six fictional import files.');
