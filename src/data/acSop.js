/** Air-conditioner install / service inspection SOP — clause source for PDF + ingest. */
export const AC_SOP = {
  title: 'Air Conditioner Installation & Service SOP',
  docNo: 'SOP-HVAC-AC-001',
  revision: '1.1',
  vertical: 'hvac',
  sections: [
    {
      heading: '1 Purpose and scope',
      clauses: [
        {
          ref: '1.1',
          title: 'Purpose',
          body: 'This SOP defines the minimum inspection, installation, and commissioning checks for split, cassette, ducted, and packaged air-conditioning systems so SiteProof workers can capture evidence and supervisors can judge compliance against cited clauses.',
        },
        {
          ref: '1.2',
          title: 'Scope',
          body: 'Applies to new installs, replacements, and service visits on indoor fan-coil units, outdoor condensers, interconnecting refrigerant pipework, condensate drains, electrical supplies, controls, and safety devices up to 20 kW cooling capacity unless a project specification is stricter.',
        },
        {
          ref: '1.3',
          title: 'Out of scope',
          body: 'Central plant chillers, VRF systems above 20 indoor units, and gas-fired rooftop units are out of this SOP. Use the project mechanical specification and manufacturer literature in those cases.',
        },
        {
          ref: '1.4',
          title: 'Precedence',
          body: 'Where this SOP conflicts with the manufacturer installation manual, local electrical code, or a written client specification, the stricter requirement applies. Record the conflict in the job notes.',
        },
      ],
    },
    {
      heading: '2 Roles and competency',
      clauses: [
        {
          ref: '2.1',
          title: 'Worker',
          body: 'The assigned worker captures photos, a voice note, and site facts. The worker must not energise equipment until isolation, earthing, and refrigerant integrity checks in this SOP are complete.',
        },
        {
          ref: '2.2',
          title: 'Supervisor',
          body: 'The supervisor owns the rulebook, reviews fail and review verdicts, and may stop work if evidence shows live exposed conductors, missing earth, or refrigerant leak risk.',
        },
        {
          ref: '2.3',
          title: 'Competency',
          body: 'Anyone who breaks into the refrigerant circuit must hold a current refrigerant handling qualification. Electrical isolation and termination must be performed by a licensed electrician where local law requires it.',
        },
      ],
    },
    {
      heading: '3 Safety and isolation',
      clauses: [
        {
          ref: '3.1',
          title: 'Permit and PPE',
          body: 'Confirm a work permit where the site requires one. Wear eye protection, gloves, and safety footwear. Use a harness on roofs and elevated plant. Do not work on live terminals.',
        },
        {
          ref: '3.2',
          title: 'Electrical isolation',
          body: 'Isolate the indoor and outdoor units at the local isolator and the distribution board. Prove dead with a tested voltage indicator. Lock and tag the isolator before opening electrical covers.',
        },
        {
          ref: '3.3',
          title: 'Exposed conductors',
          body: 'Conductors must be enclosed in the manufacturer enclosure, conduit, gland, or trunking. Exposed, bare, unsheathed, or live conductors at the isolator, indoor terminal block, outdoor electrics, or interconnect are a fail. Temporary tape, twisted cores, or a missing cover are not an enclosure. If a photo shows exposed wiring, cite this clause.',
        },
        {
          ref: '3.4',
          title: 'Earthing',
          body: 'A continuous protective earth must be connected to indoor chassis, outdoor chassis, and isolator earth terminal. Missing, painted-over, or loose earth lugs are a fail. Paint must be scraped at earth bonding points.',
        },
        {
          ref: '3.5',
          title: 'Working at height',
          body: 'Outdoor units on walls or roofs need a stable platform or certified anchors. Do not stand on the condenser coil or fan grille. Capture a photo of the mounting and access method.',
        },
        {
          ref: '3.6',
          title: 'Refrigerant and asphyxiation',
          body: 'Do not recover or charge refrigerant in unventilated rooms. R32 and similar mildly flammable refrigerants require no ignition sources within the work zone. Leak-check before leaving site.',
        },
        {
          ref: '3.7',
          title: 'Damaged or broken wiring',
          body: 'Broken, cut, frayed, nicked, or crushed cables, and insulation that is split, burnt, or stripped beyond the terminal, are a fail. Replace the damaged length or terminate in a rated enclosure. Do not twist, crimp with pliers only, or tape a broken core. Photograph the defect. Cite SOP §3.7 for damaged wiring and SOP §3.3 if the conductors are also exposed.',
        },
      ],
    },
    {
      heading: '4 Indoor unit installation',
      clauses: [
        {
          ref: '4.1',
          title: 'Location',
          body: 'The indoor unit must be level, with manufacturer clearances at supply and return. Do not install above cookers, steam sources, or where condensate can drip onto electrics or walkways.',
        },
        {
          ref: '4.2',
          title: 'Mounting',
          body: 'Wall brackets or cassette hangers must use fixings rated for the unit mass plus vibration. Hollow-wall plasterboard anchors alone are not acceptable for outdoor-equivalent loads. Photograph the bracket and fixings.',
        },
        {
          ref: '4.3',
          title: 'Air path',
          body: 'Filters must be present, seated, and not torn. Supply vanes must move freely. Blocked returns, cardboard over grilles, or missing filters are a fail for commissioning.',
        },
        {
          ref: '4.4',
          title: 'Condensate tray',
          body: 'The indoor drain pan must be clean, unobstructed, and pitched toward the drain outlet. Standing water or algae in the tray after install indicates a fall or trap error — treat as review as a minimum.',
        },
        {
          ref: '4.5',
          title: 'Indoor electrics',
          body: 'Interconnecting cable must enter through the grommet. Strain relief is required. Loose ferrules, shared neutrals with lighting, or unterminated spare cores hanging in the box are a fail.',
        },
      ],
    },
    {
      heading: '5 Outdoor unit installation',
      clauses: [
        {
          ref: '5.1',
          title: 'Pad and clearances',
          body: 'The condenser must sit level on a pad, brackets, or anti-vibration feet. Maintain manufacturer suction and discharge clearances. Vegetation, stored goods, or a wall closer than the stated clearance is a fail.',
        },
        {
          ref: '5.2',
          title: 'Fixing and vibration',
          body: 'Wall brackets must be packed to the structure, not to render only. Use anti-vibration mounts. A unit rocking by hand or hanging on pipework is a fail.',
        },
        {
          ref: '5.3',
          title: 'Weather protection',
          body: 'Electrical covers must be gasketed and screws fitted. Missing outdoor terminal cover, open gland plates, or water in the electrics compartment are a fail.',
        },
        {
          ref: '5.4',
          title: 'Airflow and coil condition',
          body: 'Fins must not be flattened across more than 10% of the face. The fan must spin freely. Debris, builder dust, or a blocked coil requires cleaning before pass.',
        },
        {
          ref: '5.5',
          title: 'Nameplate',
          body: 'Photograph the outdoor nameplate showing refrigerant type, charge, voltage, and model. The installed refrigerant must match the nameplate. Mixed refrigerants are a fail.',
        },
      ],
    },
    {
      heading: '6 Refrigerant pipework',
      clauses: [
        {
          ref: '6.1',
          title: 'Pipe size and route',
          body: 'Liquid and suction sizes must match the manufacturer table for the actual pipe run. Excessive additional bends that exceed equivalent length must be logged and treated as review.',
        },
        {
          ref: '6.2',
          title: 'Insulation',
          body: 'Suction (and liquid where specified) must be insulated with closed-cell insulation, joints taped, and UV jacket outdoors. Bare suction with condensation on the line is a fail.',
        },
        {
          ref: '6.3',
          title: 'Flares and joints',
          body: 'Flares must be 45 degree, uncracked, and torqued to the manufacturer chart. Reused flares are not permitted. Oil stains at flares indicate a leak — fail until repaired and retested.',
        },
        {
          ref: '6.4',
          title: 'Support',
          body: 'Pipework must be clipped at intervals so it does not chafe on metal or rest on sharp edges. Unclipped vertical drops longer than 1.5 m are a review. Rubbing on a live cable is a fail.',
        },
        {
          ref: '6.5',
          title: 'Penetration and fire',
          body: 'Wall and floor penetrations must be sleeved and fire-stopped to the compartment rating. Open holes with foam only and no fire seal in a fire-rated wall are a fail.',
        },
        {
          ref: '6.6',
          title: 'Service valves',
          body: 'Outdoor service valves must be fully back-seated after charge, caps fitted with seals, and ports not left open. Missing valve caps are a fail.',
        },
      ],
    },
    {
      heading: '7 Pressure, vacuum, and charge',
      clauses: [
        {
          ref: '7.1',
          title: 'Strength / tightness',
          body: 'Pressurise with dry nitrogen to the manufacturer tightness test pressure. A decaying gauge or bubbles at joints is a fail. Never use oxygen or compressed air for pressure test.',
        },
        {
          ref: '7.2',
          title: 'Vacuum',
          body: 'Evacuate to 500 microns or the manufacturer limit, isolate, and prove no rise that indicates moisture or leak. A vacuum that will not hold is a fail. Record the micron reading in the voice note or chips.',
        },
        {
          ref: '7.3',
          title: 'Charge',
          body: 'Charge by mass on a calibrated scale. Additional charge for extra pipe length must follow the manufacturer grams-per-metre rule. Guessing charge by sight glass alone is not acceptable.',
        },
        {
          ref: '7.4',
          title: 'Leak detection',
          body: 'After charge, leak-check flares, valves, and indoor coil connections with an electronic detector suitable for the refrigerant. Any confirmed leak is a fail until repaired.',
        },
        {
          ref: '7.5',
          title: 'Recovery',
          body: 'Recover refrigerant into a labelled cylinder. Do not vent to atmosphere. Overfilled recovery cylinders are prohibited.',
        },
      ],
    },
    {
      heading: '8 Condensate drainage',
      clauses: [
        {
          ref: '8.1',
          title: 'Fall and trap',
          body: 'Gravity drains must fall continuously to the termination with no backfall. A trap is required where the manufacturer or code specifies one. A drain that discharges onto an electrical isolator or walkway is a fail.',
        },
        {
          ref: '8.2',
          title: 'Pump',
          body: 'Where a condensate pump is used, the high-level float must break the indoor unit or pump circuit. A pump without a safety float is a fail. Test the float if accessible.',
        },
        {
          ref: '8.3',
          title: 'Insulation and blockage',
          body: 'Drain pipe in unconditioned space should be insulated if sweating can damage finishes. Blocked, kinked, or crushed drain hose is a fail. Photograph the termination.',
        },
        {
          ref: '8.4',
          title: 'Secondary protection',
          body: 'In server rooms, archives, or finished ceilings, a secondary drain pan or leak detector is required by this SOP. Absence is review unless the client specification waives it in writing.',
        },
      ],
    },
    {
      heading: '9 Electrical supply and controls',
      clauses: [
        {
          ref: '9.1',
          title: 'Circuit and protection',
          body: 'The unit must be on a dedicated circuit with correct breaker or fuse rating per nameplate. Undersized conductors, shared lighting circuits, or missing local isolator within line of sight of the outdoor unit are a fail.',
        },
        {
          ref: '9.2',
          title: 'Isolator',
          body: 'The outdoor isolator must be lockable, weatherproof, and labelled with the indoor location. An isolator that does not break all live poles is a fail.',
        },
        {
          ref: '9.3',
          title: 'Cable glands and IP',
          body: 'Outdoor cable entries need glands matched to cable diameter. Unsealed knockouts or household flex through a hole without a gland are a fail.',
        },
        {
          ref: '9.4',
          title: 'Interconnecting cable',
          body: 'Use the specified screened or polarised interconnect. Reverse polarity that can destroy the PCB is a fail. Excess cable must be looped and clipped, not stuffed against the fan.',
        },
        {
          ref: '9.5',
          title: 'Controls and thermostat',
          body: 'The controller must be fixed, level, and away from supply air wash and solar gain. A loose handheld only with no wall dock where a wall controller is specified is review.',
        },
        {
          ref: '9.6',
          title: 'RCDs and bonding',
          body: 'Where local code requires RCD protection on the AC circuit, it must be present and tested. Supplementary bonding in bathrooms must not be removed to make the install neater.',
        },
      ],
    },
    {
      heading: '10 Commissioning',
      clauses: [
        {
          ref: '10.1',
          title: 'Start-up sequence',
          body: 'Energise only after isolation devices are restored, covers fitted, and the area clear of tools. Confirm indoor and outdoor fans run, reversal valves click on mode change, and there is no abnormal noise or trip.',
        },
        {
          ref: '10.2',
          title: 'Temperatures',
          body: 'Record supply and return air temperatures after 10 minutes of cooling or heating. A cooling split far outside the manufacturer band with dirty filters ruled out is review. Ice on the indoor coil during cooling is a fail until airflow or charge is corrected.',
        },
        {
          ref: '10.3',
          title: 'Current draw',
          body: 'Running current should be within nameplate FLA. Immediate overload trip is a fail. Photograph the clamp reading if taken.',
        },
        {
          ref: '10.4',
          title: 'Modes',
          body: 'Prove cool, heat (if heat pump), fan, and swing. A mode that does nothing when selected is review. Error codes on the display must be photographed and treated as fail until cleared per manufacturer.',
        },
        {
          ref: '10.5',
          title: 'Handover',
          body: 'Show the client filter access, controller, and isolator. Leave manufacturer manuals on site. Missing user instruction is review, not fail, unless the client specification requires documented training.',
        },
      ],
    },
    {
      heading: '11 Documentation and evidence',
      clauses: [
        {
          ref: '11.1',
          title: 'Photos required',
          body: 'Minimum photo set: indoor unit in situ, indoor electrics with cover off then on, outdoor unit and clearances, outdoor isolator and earth, flares or joints, drain termination, nameplate, and any defect.',
        },
        {
          ref: '11.2',
          title: 'Voice note',
          body: 'The voice note should state site, system type, refrigerant, any deviation from this SOP, and micron or charge figures. Vague notes such as “all good” without facts are review for incomplete evidence.',
        },
        {
          ref: '11.3',
          title: 'As-built',
          body: 'Record indoor and outdoor model and serial, pipe route length, additional charge, and breaker rating. Missing serials are review.',
        },
      ],
    },
    {
      heading: '12 Defects and typical fail conditions',
      clauses: [
        {
          ref: '12.1',
          title: 'Immediate fail — electrical',
          body: 'Exposed conductors, broken or frayed cables, damaged insulation, missing earth, uncovered outdoor terminals, undersized or shared circuit, or isolation that does not prove dead: verdict fail, severity high. Cite SOP §3.3 for exposed live parts and SOP §3.7 for broken or damaged wiring.',
        },
        {
          ref: '12.2',
          title: 'Immediate fail — refrigerant',
          body: 'Active leak, venting, wrong refrigerant, or a vacuum that will not hold: verdict fail, severity high. Do not leave the system in service.',
        },
        {
          ref: '12.3',
          title: 'Fail — water',
          body: 'Drain discharging onto electrics, no fall with indoor overflow staining, or pump without cut-out: verdict fail, severity med or high if over electrics.',
        },
        {
          ref: '12.4',
          title: 'Review',
          body: 'Incomplete photos, unclear pipe supports, missing secondary pan where recommended, or commissioning numbers not recorded: verdict review, severity low or med.',
        },
        {
          ref: '12.5',
          title: 'Pass',
          body: 'All isolation, earth, enclosure, pipe insulation, drain, charge, and commissioning checks in this SOP are evidenced with no leak, no exposed live parts, and nameplate match: verdict pass, severity low.',
        },
      ],
    },
  ],
};

export function sopPlainText() {
  const lines = [
    AC_SOP.title,
    `Document ${AC_SOP.docNo} revision ${AC_SOP.revision}`,
    '',
  ];
  for (const section of AC_SOP.sections) {
    lines.push(section.heading);
    for (const clause of AC_SOP.clauses) {
      lines.push(`SOP §${clause.ref} ${clause.title}`);
      lines.push(clause.body);
      lines.push('');
    }
  }
  return lines.join('\n');
}
