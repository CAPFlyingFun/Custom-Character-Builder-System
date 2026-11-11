import { GarmentShapeTransfer } from './garmentShapeTransfer';
import { BELLY_CURVES, BELLY_CURVE_NAMES, DEFAULT_BELLY_CURVE, type BellyCurve } from './bellyInterpolation';
import { attachRecoveredMeshes, applyRecoveredBaseline, fitWeights, LEGGINGS_FIT_KEYS, SHIRT_FINE_FIT_KEYS, updateLeggingsHem, releaseRecoveredMeshes } from './recoveredClothes';
import { garmentTexturePanel } from './garmentTexturePanel';
import { fabricPanel, type FabricPanel } from './fabricPanel';
import { strapBuilder, type StrapBuilder } from './strapBuilder';
import { mapBody } from './bodyRegions';
import { DEFAULT_SHIRT_LENGTH, PAINTED_SHIRT_LONGEST } from './paintTemplates';
import { AUTO_DETAIL, EMPTY_BOOK, type CharacterBook, type SavedBody, type SavedClothes } from './characterSaves';
import { characterPanel, type CharacterPanel } from './characterPanel';
import { outfitPanel, type OutfitPanel, type OutfitSource } from './outfitPanel';
import { NO_RULES, isLocked, randomize, ruleFor, withGroupLock, withRule, type RandomRules, type RandomSpec } from '../actor/bodyRandom';
import { studioLayout, studioSectionAction, type StudioLayout } from './studioLayout';
import { THEME_STAGE, otherTheme, readTheme, storeTheme, type StudioTheme } from './studioTheme';
import { frameBox, shoot, shootDataUrl, savePicture } from './snapshot';
import { History } from './strapData';
import { loadingCard, LOADING_COVERED_VAR, type LoadingCard, type LoadingPlace } from './loadingCard';
import { LoadMeter } from '../assets/loadMeter';
import { ClothShirt } from './clothShirt';
import { setClothNeckline } from './clothNeckline';
import { setClothTrim } from './clothTrim';
import { clothDetailAt, setClothDetail } from './clothDetail';
import { DetailSpots, SARAH_V2_DETAIL_POINTS, SARAH_V2_LITE_TEE_NAVEL, TeeNavel } from './detailSpots';
import { SkinPose } from './skinPose';
import { SkinContact, spreadTriangles } from './skinContact';
import { JointLimits, type JointAngles } from '../actor/jointLimits';
import { rangeDeg, type RangeLevel } from '../data/jointRange';
import { DEFAULT_SKIN, EVEN_SKIN_COLOUR, SKIN_BRUSH_CM, SKIN_CHOICES, SKIN_ORIGINAL_IMAGE, SKIN_SWATCHES, SKIN_TEXTURE_CM, hexRgb, nextSkin, skinBrushLine, skinLine, skinNote, skinStrengthLine, skinTextureLine, type SkinId } from './skinChoices';
import { SkinPainter, tilePattern, type SkinImage, type SkinPattern, type SkinStrokeSettings } from './skinPaint';
import { ensureRest } from './fabricMaterial';
import { BodyCrease, CREASE_SETTLE_MS, unitBefore } from './bodyCrease';
import { FACE_REST_OFFSET, FACE_REST_SCALE, patchFaceRig, restFromWorld, setFaceRig } from './faceRig';
import { REST_SCALE, RoomGarment } from './garment/roomGarment';
import { BEND_COMPLIANCE } from './garment/garmentCloth';
import { NavelSurface } from './garment/navelSurface';
import { NavelPatch } from './garment/navelPatch';
import { DRAPE_PROBE, setDrapeLead } from './tunicDrape';
import { cutEdgeOn, setCutEdge } from './garment/cutEdge';
import { GARMENT_DEFAULTS, GARMENT_RECORD_VERSION, clampGarmentSettings, tailorKey, withConstruction, type GarmentRecord, type GarmentSettings } from './garment/settings';
import { GarmentPanel } from './garmentPanel';
import { FaceMotion } from './faceMotion';
import { patchHairMaterial } from './hairMaterial';
import { SARAH_LOOK } from './sarahLook';
import { PREGNANCY_DEFAULT, PREGNANCY_RANGE, pregnancyOf, pregnantLine, typedNumber, typeWeek, weekIsFor, weekText, nothingTyped, type Pregnancy } from './pregnancy';
import { collectStoryBake, type StoryBake } from './storyBake';
import { BUILD_INFO } from '../ui/buildInfo';
import { IRIS_CHOICES, browsLine, eyesLine, lipsLine, mouthLine, nextEyeMode } from './faceChoices';
/**
 * THE SARAH LAB — Sarah rebuilt from Joshua's base mannequin, on a turntable,
 * to try before anything of it goes live (Joshua, 2026-10-07: "Good to test
 * Sarah maybe in a separate link in like a Dev menu I can play around with
 * before placing live").
 *
 * A DEV TOOL scene (ARCHITECTURE §8), the Story Lab's shape: no session, a
 * BACK control, one model. What it shows is what the bake put in the file:
 *
 *   BUMP      the belly morph targets (`scripts/bellyMorph.mjs`): 100% is the
 *             master as modelled, 200% twice that (twins and more), 0% nearly flat;
 *             her bust grows from the normal model at 0% to 1.5× at 100% and 2× at 200%. Every primitive that
 *             carries the target follows it, so the clothes grown from her
 *             body shrink with it.
 *   (weight)  past full term the bump sags by its size, and her belly and each
 *             breast are simulated masses that lag and settle as she moves
 *             (softBody.ts: the womb's, her left breast's, her right breast's);
 *             BOUNCE nudges all three.
 *   FINGERS   all ten curled together, toward the palm: the master's own
 *             finger chains, found from the bind pose, never by name.
 *   OUTFIT    cycles the garments (`scripts/growClothes.mjs`), by material:
 *             tee + leggings, bikini, swimsuit, none (`OUTFITS`).
 *   STAND, WALK, SIT  the game's own poses: `poseHuman` and the pregnant sit.
 *   T-POSE exposes the side hem by restoring the master's bind pose.
 *
 * The camera ORBITS her: drag to go round, pinch or wheel to come closer.
 * The model is authored in metres and scaled by M on one node, as the Story
 * Lab's bodies are.
 */
import * as THREE from 'three';
import { SkeletonInV2, carryLandmarks } from './skeletonInV2';
import { footCover } from './footCover';
import { HUMAN_POSE_TURNS, humanStride, poseHuman } from '../actor/humanPose';
import { newJointTurn, type BindJoint, type HumanMeasure, type JointTurn, type MutableJointTurn } from '../actor/humanRig';
import { measureContacts, type ContactPoint, type ContactSet, type FingerName } from '../actor/contactPoints';
import { closeToTouch, HAND_GRIP, shapeDistance, type GripShape } from '../actor/handGrip';
import { BodySurface, type SurfaceAnchor } from './bodySurface';
import { SEATED_TURNS, poseSeated } from '../actor/humanSeated';
import { createSoftBaby, restorePose, stepSoftBaby, type SoftBaby } from './softBaby';
import { createSqueezeUniforms, patchSqueeze, setSqueeze, squeezePoints } from './babySqueeze';
import { createSkinUniforms, patchSkin, stepSkin } from './babySkin';
import { measureHuman } from '../actor/humanSkeleton';
import { bobDrop, walkWeight, weighWalk, WALK_WEIGHT } from '../actor/walkWeight';
import { createFeet, groundFeet, type FeetState, type FootConform } from '../actor/humanFeet';
import { BODY_KG, balanceAt, centreOfMass, extrapolatedCom, supportOutline, wombKg, wombPlace, type BodyPoints, type P2, type P3 } from '../actor/bodyMass';
import { LEVEL_NONE, easeLevel, levelBody, type Level } from '../actor/levelBody';
import { PelvicOrgansView } from './pelvicOrgansView';
import { headPassage } from '../actor/birthCanal';
import skeletonPelvis from '../data/pelvis/skeleton.json';
import skeletonTorso from '../data/torso/skeleton.json';
import v2Pelvis from '../data/pelvis/v2.json';
import v2Torso from '../data/torso/v2.json';
import { AbdomenView } from './abdomenView';
import { ThoraxView } from './thoraxView';
import { measureThorax, type ThoraxLandmarks } from '../actor/thoracicOrgans';
import v2Thorax from '../data/thorax/v2.json';
import { wombRoomOf } from './wombRoom';
import { STOMACH, RECTUM } from '../actor/abdominalOrgans';
import { BLADDER } from '../actor/pelvicOrgans';
import { drawnFill, gutNeeds, hoursToBladderUrge, restingGut, urineMlH, type GutState } from '../actor/gut';
import type { AppScene, FrameInfo, SceneContext, SceneFactory } from '../app/Scene';
import { assets, assetUrl } from '../assets/assets';
import { release } from './release';
import { BODY_CONTROLS, BREAST_DIMENSIONS, clampShape, controlLine, defaultBodyShape, parseShape, resetControl, serializeShape, setControl, setLinkedControl, type BodyControl, type BodyShape } from '../actor/bodyShape';
import { applyShapeFields, baseShapeFields, liftShapeFields, type ShapeFields, type ShapePost } from '../view/bodyShapeView';
import { BUILD_PROFILES, buildAmounts, buildKey, heightLine, heldSegments, profileOf, withProfile, type BuildAmounts, type BuildSegment } from '../actor/bodyBuild';
import { applyBuildToBones, applyBuildToMesh, buildBoneOffsets, buildMeshFields, prepareBuildRig, standingLift, type BuildMeshFields, type BuildRig } from '../view/bodyBuild';
import { Sneakers } from './sneakers';
import { SLOPE, WalkStrip, slopeGrade, slopeLine, slopeNormal, type SlopeHeading, type StageSlope } from './walkStrip';
import { StepWatch, TileSteps } from './footsteps';
import { dropIdleMorphs } from '../view/morphPrune';
import { BIRTH_CLEFT_FIELD, BIRTH_LIPS_FIELD, birthAreaCentre, birthAreaFields, LIPS_COVERED, patchBirthShade } from './birthArea';
import { BIRTH_POSES, FLOOR_SIT, blendBirthSpec, poseBirth, type BirthSpec } from '../actor/humanBirth';
import { AUTO_LIES, BABIES_NAME, BABY_MODEL, BABY_MODEL_LENGTH, babiesInHer, babiesPast, babySize, growSac, packBabies, type BabyFit, babyLine, babySolid, carriedShare, weekForBump, chartBump, herChart, herWeek, Cord, cordLength, cordTube, layCordTube, layPlacenta, placentaGeometry, placentaOpen, placentaSpots, curlFrame, floatDrift, floatRoom, floatTune, kickOnSkin, KICK_FELT_M, KICK_MOST_M, KICK_WIDE_M, liningPast, kicksShare, moveEnvelope, moveLength, nextMove, poseMove, poseOnHer, poseDescent, poseAlong, poseCradle, BABY_BONES, BABY_NAVEL, BABY_STRAIGHT_MODEL, CORD_CUT, ROLL_RAD, solidDeep, type MoveKind, type CordBody, type PlacentaSpot, LIE_NAME, pushAt, sacAround, sacRadius, WOMB_WALL_M, wombFromSkin, type BabySolid, type BellyPush, type CurlFrame, type Lie, type WombShape } from './baby';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { PUBIC_PRESS, pubicPressWant, setPush, jiggleOf as jiggleOfMesh, navelAfterBirth, navelPressure, restingSoftBelly, softAt, softBellyWant, stepSoftBelly, type SoftBellyWant } from './softBody';
import { createVulvaPatch, VULVA_OPEN, type VulvaPatch } from './vulvaMesh';
import { BIRTH_THIGHS_FIELD, birthThighsField } from './birthThighs';
import { BIRTH_SEAT_FIELD, birthSeatField } from './birthSeat';
import { BIRTH_GAP_FIELD, birthGapField, birthGapInfo, birthGapUnderMask } from './birthGap';
import { BIRTH_WEIGHTS, createBirthWeights, type BirthWeights } from './birthWeights';
import { createAnkleWeights, type AnkleWeights } from './ankleWeights';
import { createFingerWeights, type FingerWeights } from './fingerWeights';
import { splitFingers, type FingerSplit, type V3 as SplitV3 } from '../actor/fingerSplit';
import { formFingers, handBack, OWN_FINGERS } from '../actor/ownFingers';
import { roundFills, type RoundFills } from '../actor/fingerFillShape';
import { betterTris } from '../actor/betterTris';
import { createOwnFingers, type OwnFingers, type OwnFingersHand } from './ownFingersMesh';
import { createFingerFills, type FingerFills } from './fingerFills';
import { BIRTH_ROOM_FIELD, createBirthRoom, type BirthRoom } from './birthRoom';
import { BIRTH_NORMALS_FIELD, createBirthNormals, type BirthNormals } from './birthNormals';
/** HER KNEES SMOOTHED AS POSED in a birth pose (Joshua, 2026-10-31: "the upper and lower legs at the knee... should remain
 * separated, but appear merged"): her groin's smoothing (birthNormals.ts) run round each knee */
const BIRTH_KNEES_FIELD = 'shape:birthKnees';
/** BIOLOGICAL SHAPE: a baby's head at term is about 9.5 cm across (its biparietal diameter) on a 51 cm baby; a smaller
 * baby's in proportion. And a contraction lifts her womb up and forward a little (metres at the peak; GAME TUNING). */
/** The poses a birth may run in (Joshua, 2026-11-02). */
const BIRTH_POSES_OK: readonly string[] = ['recline', 'squat'];
/** GAME TUNING: where her baby lies on her once born (her rest metres): along her front down her middle (within `across`
 * of it), its head end where she is at height `top` (under her breasts) and its bottom `span` below; its middle out from
 * that line by `depth` of its own curled depth (it lies flatter once out of the curl) and `over` of how far her belly
 * rounds up between the two, and `gap` more */
/** GAME TUNING: how open she is as her baby's body leaves her, easing back from there */
const BIRTH_AFTER_OPEN = 0.35;
/** GAME TUNING: how much of her belly settles away after the birth (its womb shrinking back toward a five-month size) */
const BIRTH_SHRINK = 0.45;
/** GAME TUNING: how far further in than her skin her womb is held as it settles (metres, once settled) */
const BIRTH_WOMB_IN = 0.015;
const BIRTH_REST = Object.freeze({ top: 1.2, span: 0.3, across: 0.05, depth: 0.32, over: 0.7, gap: 0 });
/** GAME TUNING (P3, twins on her chest side by side, Joshua 2026-11-04): each this far off her middle (metres, her rest
 * frame), the first to her left */
const TWINS_ON_HER = Object.freeze({ across: 0.075 });
/**
 * GAME TUNING (P3b, the SQUAT birth, Joshua 2026-11-04): a soft mat on the floor under her whenever she squats -- `long`
 * (front to back) by `wide`, `thick` metres and its edges rounded `bevel` more top and bottom, its middle `back` metres
 * behind her hips, where she sits back -- and, sat back on it, her hips `hips` metres over the floor (the mat and the
 * flesh under her hip joints). (`wide` from 0.85 on 2026-11-04: her squat's feet turned out stood her toes over its edges.)
 */
const BIRTH_MAT = Object.freeze({ long: 1.2, wide: 1.1, thick: 0.025, bevel: 0.004, back: 0.18, hips: 0.135 });
/**
 * HER FEET ON THE MAT (P3b; Joshua, 2026-11-04: "why is her feet disappearing in the mat? She should really rotate at her
 * ankles and if too much, then her heel should be on the mat with her feet up slightly"). Sat back, her legs as posed put
 * her ankles 2 cm over the mat and her toes 9 cm into it, and squatting the balls of her feet were 1.4 cm in. Each foot is
 * turned at its ankle to lie flat -- within the ankle's range (data/jointRange.ts, placed) -- and her knee opened or bent
 * to set it down on the mat; an ankle at the end of its range leaves the foot on its heel, toes up. GAME TUNING: a sole
 * pressed `sink` metres into the soft mat; her knee turned at most `kneeMost` degrees from her pose to set a foot down,
 * bending it further (her foot in under her) costing as much as `tuck` degrees more of opening it (her foot out in front
 * of her); `rounds` passes of ankle-then-knee; a foot within `still` metres of where it should be left alone.
 */
const FEET_ON_MAT = Object.freeze({ sink: 0.003, kneeMost: 50, tuck: 10, rounds: 4, still: 0.002 });
/** GAME TUNING (P3b, keepBalance): squatting, her centre of mass kept `margin` metres inside where her soles touch the mat,
 * her body tipped over her ankles at most `most` degrees for it */
const BALANCE_KEEP = Object.freeze({ margin: 0.04, most: 10 });
/**
 * GAME TUNING (P3, a triplet's third in a bassinet beside the bed, Joshua 2026-11-04), metres: its basket `long` by
 * `wide` and `deep` (sides `wall` thick, a `mattress` in it), its rim `rimAbove` over her opening's height (the bed's
 * level), stood `out` to her left of her opening and `up` along the bed toward her head; four legs `legs` thick to the
 * floor, its rim never under `rimLeast`; a baby lifted into it rises `arc` over the way there.
 */
const BASSINET = Object.freeze({ long: 0.74, wide: 0.42, deep: 0.2, wall: 0.012, mattress: 0.04, rimAbove: 0.1, rimLeast: 0.62, out: 0.85, up: 0.6, legs: 0.028, arc: 0.3 });
/** GAME TUNING: its straight body faded in over its curled one between these shares of its legs' straightening */
const BABY_BODY_FADE = [0.3, 0.7] as const;
/** GAME TUNING: where a hand rests on a knee -- over its top, the palm `capTilt` of the way from the thigh's top round to
 * the knee's point, the fingertip `capPast` beyond the knee and `capOut` off the bone, the wrist `lift` higher than the
 * fingers (metres); the elbow's place round the arm tried at `poleSteps` places, an elbow in toward her costing
 * `poleOut`, and (holding her baby in her arms) each metre the elbow is from where its head lies costing `elbowWant` (as
 * radians of wrist twist do); each metre her fingertip ends up from where it was asked costing `tipMiss` (a reach past
 * her arm's length, or a hand her wrist could not turn to); the turns (degrees, about the palm's face) the fingers' way
 * is tried at from the way asked, each radian of turn costing `fingerTurnCost`; and how far (metres) the place asked
 * jumps in one frame before the whole search is made again (`searchAgain`). A place that moves less is followed from
 * last frame's choice, the elbow's place `followPoles` either way of it: the elbow goes with a moving hand instead of
 * flipping round it, and a hand changing holds no longer pays for the whole search every frame (with her torso to keep
 * out of, 16 ms a frame in the probe); once it stops, the whole search is made once more where it stopped */
const KNEE_HANDS = Object.freeze({ capOut: 0.058, capTilt: 0.3, capPast: -0.03, lift: 0.012, poleSteps: 24, poleOut: 1.5, elbowWant: 10, tipMiss: 10, fingerTurns: [0, -25, 25, -50, 50, -75, 75], fingerTurnCost: 0.15, searchAgain: 0.02, followPoles: 2 });
/**
 * HER ARMS KEEP OUT OF HER (2026-11-04, Joshua: "her arm is in her stomach a little bit"; skinContact.ts). Her torso's
 * skin as drawn, sampled a triangle each `spacing` (rest metres) over the part of her in `box` (her rest frame: `across`
 * either side of her middle, `from` to `to` up her, front of `back`) that is not her arms, neck or head, in a grid of
 * `cell`. Each arm asked at `points` + 1 places along its upper arm (from `upperFrom` of the way out of her shoulder --
 * nearer, it is joined to her) and its forearm (to `foreTo` of the way to her wrist -- her hand is laid on what it holds
 * by its own target), each round to its radius (BIOLOGICAL SHAPE, a slim adult woman's: `upper` at her shoulder's end and
 * her elbow's, `fore` at her elbow's and her wrist's; metres). In her by more than `slack` (soft skin gives that much
 * where an arm rests on her) costs `weight` a metre, as radians of a hand turned from the way asked do. GAME TUNING.
 */
const ARM_IN_HER = Object.freeze({ spacing: 0.025, cell: 0.05, box: { across: 0.25, from: 0.8, to: 1.45, back: -0.08 }, upperFrom: 0.4, foreTo: 0.9, points: 4, upper: [0.04, 0.034], fore: [0.033, 0.025], slack: 0.006, weight: 50 });
/**
 * GAME TUNING (P2, POSITION B -- cradled in her arms, Joshua 2026-11-03): her baby on its back across her, its head to
 * her left in the crook of her left elbow, her left forearm under its back and her left hand under its bottom, her right
 * hand on its tummy. In her rest frame (metres): its middle at `y` up her, `left` toward her left and `out` off her skin
 * there -- and its middle at least `armClear` out from her belly `armBelow` under it, where her forearm passes beneath
 * it; its length tipped `rise` up toward its head; its back turned `lie` (radians) from her chest down onto her
 * forearm (0 would be its back flat against her chest -- a palm under it there would face away from her, a turn no
 * forearm makes: her left hand stood a hand short of it, its wrist bent as far as a wrist goes); her elbow `crook`
 * under its head and `past` beyond it; her right palm `tummy` of the way from its chest to its hips; and the seconds it
 * takes to turn into her arms or back onto her
 */
const BABY_CRADLE = Object.freeze({ y: 1.16, left: -0.03, out: 0.1, rise: 0.3, lie: 1.2, armBelow: 0.08, armClear: 0.065, crook: 0.08, past: 0.03, tummy: 0.4, arc: 0.08, seconds: 2.2 });
/**
 * GAME TUNING (P3, twins IN HER ARMS -- the double cradle): one twin in each arm, its head in that elbow's crook and its
 * bottom toward her middle, her palm under it; each one's middle `across` metres off her middle, its length tipped
 * `rise` up toward its head (a V, so their feet do not meet), the second `behind` metres nearer her than the first so
 * where they come close one lies in front of the other; their middles `y` up her and `out` off her skin (lower and
 * nearer her than one baby: two held out as far had her arms straight). The rest as BABY_CRADLE.
 */
const TWINS_CRADLE = Object.freeze({ across: 0.085, rise: 0.45, behind: 0.04, y: 1.12, out: 0.07 });
/** GAME TUNING (P2): her hands on her baby lying on her -- her left palm's middle this share of the way from its chest up
 * to its neck, her right palm's this far (metres) down from its hips toward its feet, cupped this much over its bottom,
 * its fingers this share down along it toward its legs (the rest across it);
 * the palm this thick off its skin (metres), its middle this share of a hand back from the fingertip; and the seconds her
 * hands take to go to it or back to her knees; sat back on the mat after a squat birth (P3b), her right palm `squatUp`
 * metres further up its bottom */
/** GAME TUNING (P3b, the catch in a SQUAT birth): her left hand goes under its head between these points of its way out
 * (`BirthMoment.down`: 1 its head's middle at her opening), her right under its body between these; its body `under`
 * metres from its middle to its underside (a full-term baby's, scaled with it); from `swingFrom` of its way out (most of
 * it out of her) to all of it, her hands swing it `swing` degrees up and forward about her opening and raise it `lift`
 * metres. */
const SQUAT_CATCH = Object.freeze({ head: [0.85, 1.2] as const, body: [1.3, 1.75] as const, under: 0.05, swingFrom: 1.55, swing: 75, lift: 0.12,
  /* SHE BENDS OVER TO CATCH IT (2026-11-04: upright, her hands stopped 20-36 cm short of it -- her arms straight out at
   * where it was, her left one up over it as she lifted it): as its head comes (`lean`, of its way out) her back and chest
   * bend forward and her neck less, `leanBy` degrees each at most; straightened again between `leanOff`'s shares of the
   * way it is lifted to her chest -- brought in to her first, its way there quickest at its start. Lifted, it comes up close to her -- `arc` metres up and out at the middle of the way (her own: lying
   * back, the bed's arc carried it 12 cm out, past her reach) */
  lean: [0.55, 1.0] as const, leanBy: { spine: 28, chest: 24, neck: -10 }, leanOff: [0.25, 0.7] as const, arc: [0.05, 0.02] as const,
  /* hanging out of her before it is swung up, her hands rest ON it -- her palm on the side of it toward her shoulder,
   * fingers down round it -- and go under it over `under2` of its way out from `swingFrom` (under its head as it hung,
   * her hand reached for the mat, 21 cm past her reach); and she sits back once it is `sitFrom` of the way up to her
   * chest, not as it leaves her hands' reach */
  under2: 0.3, sitFrom: 0.35 });
const BABY_HANDS = Object.freeze({ backUp: 0.35, bottomDown: -0.03, bottomCup: 0.6, bottomFeet: 0.85, palm: 0.012, palmAt: 0.45, seconds: 1.4, squatUp: 0.045 });
/** Its soft body's chains (softBaby.ts): each arm and leg from its shoulder or hip out to its hand or foot -- never its
 * torso, neck or head (Joshua, 2026-11-03: "Keep the soft body after birth but not the torso... to hopefully keep the
 * shape") */
const BABY_SOFT_CHAINS: readonly (readonly string[])[] = [BABY_BONES.arm.left, BABY_BONES.arm.right, BABY_BONES.leg.left, BABY_BONES.leg.right];
/** GAME TUNING: her skin under her baby as it lies on her -- every `every`th point within `reach` (metres), chosen again
 * when it has moved `again`; its joints kept `margin` out from it; and all of it lifted off her as far as its deepest
 * point (within `near` of her skin) goes into her, easing back over `liftEase` seconds; tipped at most `pitchMost`
 * degrees; and how much its pose holds against its soft body's springs while it lies on her (`hold`, 0..1) */
const ON_HER_SKIN = Object.freeze({ reach: 0.3, every: 3, again: 0.05, margin: 0.008, near: 0.06, liftEase: 0.4, pitchMost: 35, hold: 0.6 });
/** GAME TUNING: its parts bent down onto her as it lies on her, in turn -- each bone, the most it bends (degrees), the
 * bone it points at, and the skin whose touching her stops it (the bones carrying it: its own part, not its arms that
 * already lie on her), and how far it may bend back away from her where it goes into her (degrees: its neck, its head
 * lifted onto her once its back has bent down) -- its back a little from its waist up, and its neck (its legs are laid
 * by its frog pose, ON_HER, and kept on her skin by its soft body: bent onto her here, its hips crumpled, and its frog
 * slid down her belly's slope -- P2, 2026-11-04) */
const ON_HER_DRAPE: readonly (readonly [string, number, string, readonly string[], number?])[] = [
  ['Bone_005', 12, 'Bone_004', ['Bone_005', 'Bone_004', 'Bone_003', 'Bone_002']], ['Bone_004', 12, 'Bone_003', ['Bone_004', 'Bone_003', 'Bone_002']],
  [BABY_BONES.neck, 50, BABY_BONES.head, [BABY_BONES.neck, BABY_BONES.head, BABY_BONES.crown, 'Bone_019'], 60],
];
/** v3: how far down her canal her baby's head is (the birth's `down`) before her opening's doors are told what passes them
 * (its body's points are read each frame from there). GAME TUNING (the head reaches the doors near 0.7). */
const BIRTH_DOORS_FROM = 0.4;
/**
 * GAME TUNING (v2 with her skeleton's opening): how open she is (0..1) where her own skin starts to go down to her doors,
 * and where all of it has. Up to `from` her doors' feet are still inside her -- they hang from 3 cm up her canal, and her
 * canal has come down less than that -- so there is nothing below her to stretch her skin over: her doors stand in her
 * skin's own opening, which opens for them as v2's does (laid on a tube that is still inside her, her skin was pushed
 * about round it and tore, 15% and 30%, 2026-11-10). From there her skin goes down to her doors, and its own opening is
 * let shut again by `holeShut`.
 */
const SEAT_SKIN_OPENS = Object.freeze({ from: 0.3, to: 0.55, holeShut: 0.5 });
/** GAME TUNING (v2 with her skeleton's opening): from how far down her baby's head is (the birth's `down`: 1 its head at
 * her opening, 2 all of it out) her canal and doors are held as open as they have been, and how fast they are let go
 * once it is out of her (a second, of all the way open). */
const SEAT_HELD = Object.freeze({ from: 0.9, release: 0.8 });
/** GAME TUNING: where her baby's body goes from lying along her canal to lying as its birth has it out of her -- from this
 * far inside her opening to this far out of it (metres along its way); and how far behind its neck its back comes onto
 * the middle of her canal (`settle`: its neck's joint lies beside her canal's line, where its tucked head has it); and
 * how far behind the middle of its head the way its head points is read from (`headSpan`: about where its neck is). */
const BIRTH_ALONG = Object.freeze({ inside: 0.01, outside: 0.02, settle: 0.05, headSpan: 0.06 });
const BIRTH_HEAD = Object.freeze({ radius: 0.0475, atLength: 0.51, lift: [0, 0.008, 0.007] as const, tangentSpan: 0.0125, bodyBehind: 0.1, pastMouth: 0.6, centreEase: 0.35 });
/**
 * THE AFTERBIRTH, drawn (GAME TUNING; its timing is birthSequence.ts AFTERBIRTH): the placenta folded soft as it comes down
 * her canal and out (along its travel, across it, and its thickness, each a share of the disc's), how much of that fold
 * it keeps in the bowl (none: it opens out there, one dish in another) and how deep a dish it opens into (metres at its
 * rim: openPlacenta), how far past her opening it comes clear of her (metres), how high it arcs into the bowl (metres),
 * and between which `placentaDown` her rim hugs it; how much longer than
 * the way from it to her opening its cord inside her is once cut; how long the cut cord hangs out of her (metres) and in
 * how many links; the bowl (metres: its rim's radius, its depth, its flat bottom's radius, its inside's floor, how far
 * to her right of her opening its middle stands, how far past her opening, and how far below her opening it sits -- on
 * the bed she reclines on, at RECLINE_HIPS_M, which the room does not draw: "a small bowl beside her on the bed", Joshua
 * 2026-11-03; see placeBowl); how far her opening opens round it (a share, as its slider); and how much smaller her belly
 * settles after it (a share of her bump, on top of BIRTH_SHRINK).
 */
const AFTERBIRTH = Object.freeze({
  fold: { along: 0.8, across: 0.42, thick: 1.6 }, inBowlFold: 0, dish: 0.035, clear: 0.03, arc: 0.07, hugFrom: 0.95, hugTo: 1.95,
  innerSlack: 1.15, hang: 0.25, hangNodes: 14,
  bowl: { rim: 0.13, depth: 0.07, bottom: 0.06, floor: 0.004, side: 0.18, ahead: 0.15, below: 0.11, squatSide: 0.36, squatAhead: 0.02 },
  open: 0.55, shrink: 0.12,
});
import { BIRTH_CONTACT_FIELD, createBirthContact, type BirthContact } from './birthContact';
import { KNEE_TURN_FIELD, createKneeTurn, type KneeTurn } from './kneeTurn';
import { HIP_TURN_FIELD, createHipTurn, type HipTurn } from './hipTurn';
import { birthAt, birthLength, birthLine, REALISTIC_STRETCH, type BirthMoment, type BirthPace, type BirthTurn } from './birthSequence';
/** GAME TUNING: all of it within `near` of a knee, none past `far` (metres); `passes` of `lambda` each */
const KNEE_SMOOTH = Object.freeze({ near: 0.06, far: 0.12, passes: 60, lambda: 0.6, restore: 0 });
import { DEFAULT_VULVA_KEEP } from './detailMaterials';
import { attachJiggle, bellyTune, breastTune, createJiggleUniforms, feltAcceleration, GRAVITY, GRAVITY_SHARE, LEG_TUNE, restingMass, stepMass, type LegBones, type Mass } from './softBody';
import { applyMilk, applyWomb, applyZeroRefine, babyAnchors, babyWeightState, chestAnchors, chestFieldWeights, groinAnchors, groinFieldWeights, loadMilk, milkAnchors, milkBalanceState, milkFieldWeights, milkState, MILK_PATH, babyFieldWeights, loadWomb, loadZeroRefine, sidesAnchors, sidesFieldWeights, zeroRefineWeight, UPPER_FIELD_PREFIX, WOMB_PATH, ZERO_FIELD, ZERO_REFINE_PATH } from './zeroRefine';
import { NAVEL_MORPHS, type NavelPiece } from './navelPiece';
import { ArmJoints } from './armJoints';
import { clothingVertex } from './clothingPose';
import { createNavelSoft, type NavelSoft } from './navelSoft';
import { HumanRig, findSkinnedMesh } from '../view/HumanRig';
import { UNITS_PER_METRE } from './units';
import {
  SARAH_V2_HAIR_MODEL, BELLY_MOTION, BELLY_TARGET, trimShown, BREAST_TARGETS, BUMP_MAX_PERCENT, GARMENTS, RECOVERED_SHIRTS, OUTFITS, outfitLine, modelLine, nextModel, openingLine, refineLine, refineWeight, nextOutfit, wornGarments, coverMask, bodyNeverHidden, uncoveredSkinIndices, UNDER_TOP_GARMENT, BELLY_REFINE_TARGET, SEAT_TARGET, seatCorrectiveWeight, SARAH_LAB_MODELS, SARAH_LAB_DEFAULT_MODEL, SARAH_SKELETON_MODEL, levelArmsModel, fleshlessModel, SARAH_LAB_ACTION, SARAH_LAB_FIELD, birthOpenLine, foldBackLine, xrayLine, birthBulgeLine, SARAH_LAB_HUD_ROLE, SARAH_LAB_SCENE_ID, shirtLengthLine, sarahModelPath, BODY_RANDOM_SPECS, CLOTH_SHIRT_PATH, teeLengthLine, teeLengthParts, sleevesLine, necklineLine, neckShapeLine, CLOTH_NECKLINE_DEFAULT, clothLine, CLOTH_DIALS, CLOTH_TUNE_DEFAULT, CLOTH_TEE_LENGTH_DEFAULT, clothTuning, clothRestScale, type ClothTune,
  labTitle, CLOTH_SEATED_LINE, bellyMotionWeights, bellyWeights, breastWeightsForShape, bodyShapeFieldWeights, SIZE_TILT_PRESETS_DEG, effectiveTiltDeg, stepSeated, bustVolume, BREAST_GROW_TARGET, settledSitFor, bellyUpperWeight, BELLY_UPPER_TARGET, navelWeights, NAVEL_FLAT_TARGET, NAVEL_INNIE_EXTRA, NAVEL_OUTIE_EXTRA, tPoseTurns, ARM_SIDES, armsLine, ARM_RAISE_TARGETS, armRaiseWeight, SEAT_V2_TARGET, seatCorrectiveV2Weight, fingerBend, THUMB_TO_PALM, bumpLine, fingersLine, restingBellySpring, statusLine, walkBounceAccel, walkSwayAccel,
  offeredOutfits, outfitThumbPath,
  type Garment, type SarahLabPose, isBirthPose, recoveredPartsFor, recoveredPartPath, isShirtPart, shirtOfPart, type RecoveredPart, SARAH_DEFAULT_OUTFIT, SIM_TEE_OUTFIT, RECOVERED_GARMENTS,
} from './sarahLabTool';
import { blendJointTurns, sitEase, stepSit } from './poseBlend';

const M = UNITS_PER_METRE;
/** What the story bake leaves out (`bakeForStory`): her vulva's own parts, inside her and under what she wears. */
const STORY_LEAVES_OUT = new Set(['sarahVulva', 'sarahVagina', 'sarahLips', 'sarahOuterRing']);
/** A build key no build has: her bones laid again whatever her build (her approved build's key is ''). */
const STALE_BUILD = '\u0000stale';
/** How far two fingers may pan the camera's aim (metres above the floor): her feet to just above her head. GAME TUNING. */
const PAN_BOTTOM = 0.05, PAN_TOP = 1.85;
/**
 * How the outfit's new tee is put on her, in seconds from when it is tailored -- the review probes' own dressing
 * (`.scratch` probe `dress()`): weightless until `weightless` and pinned at the neckline where it settled; her arms
 * eased out to `raise` radians by `out`, held to `hold`, eased down by `down`; pinned again at `done`.
 */
const DRESS = Object.freeze({ weightless: 1.2, raise: 0.55, out: 1.5, hold: 2.7, down: 3.7, done: 4.3 });
/**
 * While her shape is changing (the belly slider dragged), the new tee is cut again at most this often, seconds: a cut
 * (`GarmentCloth.refit`, her shape smoothed over the sheet) is 40-100 ms, too long for every frame of a drag.
 */
const GARMENT_REFIT_EVERY = 0.12;
/** RANDOMIZE's group locks, as their buttons read. */
// (`build` reads PROPORTIONS on screen: the room's Build tab is the strap builder's)
const RANDOM_GROUPS = [['build', 'PROPORTIONS'], ['belly', 'BELLY'], ['breasts', 'BREAST'], ['walk', 'WALK']] as const;
/** A BUILD control's own segment, where it has one (its slider can be held at the segment's shortest or longest). */
const SEGMENT_OF: Partial<Record<BodyControl, BuildSegment>> = { upperLeg: 'upperLeg', lowerLeg: 'lowerLeg', torso: 'torso', neck: 'neck', upperArm: 'upperArm', forearm: 'forearm' };
/** What the fabric editor calls each garment. */
const GARMENT_LABEL: Partial<Record<Garment, string>> = {
  shirt: 'Tee', shirtAthletic: 'Athletic tee', shirtRelaxedHigh: 'Relaxed tee', shirtRelaxedLow: 'Relaxed tee',
  shirtSpandexHigh: 'Spandex tee', shirtSpandexLow: 'Spandex tee', shirtSpandexLite: 'Spandex tee', leggings: 'High leggings', leggingsLow: 'Low leggings',
  bikini: 'Bikini', swimsuit: 'Swimsuit',
};
/** What the card says while the room opens. */
const OPENING_LABEL = 'Opening the character room';
/** The camera's vertical view on a landscape screen (degrees). */
const LANDSCAPE_FOV = 38;
/** Held upright: the CSS pixels BACK and the title take at the top of the stage, kept clear of her. */
const UPRIGHT_TOP = 56;
/** The camera's angles (Joshua, 2026-10-23, from the Character Studio preview): yaw about her, radians. */
const VIEW_ANGLES = Object.freeze([
  { id: 'front', label: 'FRONT', yaw: 0 },
  { id: 'three-quarter', label: '¾', yaw: 0.5 },
  { id: 'side', label: 'SIDE', yaw: Math.PI / 2 },
  { id: 'back', label: 'BACK', yaw: Math.PI },
] as const);
/** How long her body must hold still before a change becomes an UNDO step (ms). */
const BODY_SETTLE_MS = 450;
/** This device's storage, or null where it cannot be had (a private window). */
function localStore(): Storage | null { try { return globalThis.localStorage ?? null; } catch { return null; } }
/** Where the room remembers which skin she wears (SKIN; an uploaded picture is not kept). */
const SKIN_KEY = 'traddomium.sarahlab.skin';
/**
 * The browser's database v0.7.0 kept a frozen tee in (CLOTH · FROZEN, taken out at Joshua's word on 2026-11-07: "let's
 * also remove the frozen live shirt"): nothing else used it, so it is let go, and the few hundred kilobytes with it.
 */
const FROZEN_TEE_DATABASE = 'traddomium-sarahlab';
/** The brush paints on a copy of her map at most this many pixels square (skinPaint.ts holds two copies in memory). */
const PAINT_MAX_SIZE = 2048;
/** A card's picture, in pixels (3:4, sharp at twice a card's width on a phone). */
const THUMB_SIZE = Object.freeze({ width: 168, height: 224 });
/** The quick sizes under the bump slider (percent). */
const QUICK_SIZES = Object.freeze([0, 50, 100, 150, 200]);
/** A walk on the spot, metres a second: an unhurried pace. */
const WALK_SPEED = 1.1;

export interface SarahLabHooks {
  onBack(): void;
  /** Offline fitting uses native garments to avoid loading its own generated outputs. */
  readonly nativeOutfitPreview?: boolean;
  /**
   * `?skin=ktx2`: the KTX2 skin pilot (`SARAH_V2_BODY_KTX2_MODEL`). An override from the address, never a setting; the
   * status line says so while it is in force.
   */
  readonly skin?: 'ktx2' | null;
  /**
   * The character book (`characterSaves.ts`): where saved characters and the outfit library are kept. The app gives the
   * device's storage; without it the panel keeps them for the session only.
   */
  readonly characters?: { read(): CharacterBook; write(book: CharacterBook): void };
}

export type SarahLabWire = (ctx: SceneContext) => SarahLabHooks;

// ---------------------------------------------------------------- the fingers

interface Finger {
  readonly joints: readonly number[]; readonly axis: THREE.Vector3; readonly thumb: boolean;
  /** SPREAD (P4): the axis its knuckle turns about to move it away from the middle finger, across the palm's plane (for the
   * middle finger itself, toward the index); none for a thumb */
  readonly spread: THREE.Vector3;
}

/**
 * Each hand's fingers, from the bind pose: under each wrist, the first joint
 * that branches four ways or more is the hand, and each branch is a finger
 * (its joints down to the tip, the tip itself left out). The thumb is the
 * branch whose base is furthest from the others. A finger curls about the
 * axis across its own length and the palm's normal, signed so the fingers
 * close over the palm on either hand.
 */
function findFingers(bind: readonly BindJoint[], measure: HumanMeasure): Finger[] {
  const kids = bind.map(() => [] as number[]);
  bind.forEach((b, i) => { if (b.parent >= 0) kids[b.parent].push(i); });
  const at = (i: number) => new THREE.Vector3(bind[i].x, bind[i].y, bind[i].z);
  const out: Finger[] = [];
  for (const wrist of [measure.joints.wristL, measure.joints.wristR]) {
    // the hand: the first joint at or below the wrist with four branches or more
    let hand = -1;
    const queue = [wrist];
    while (queue.length) {
      const j = queue.shift()!;
      if (kids[j].length >= 4) { hand = j; break; }
      queue.push(...kids[j]);
    }
    if (hand < 0) continue;
    const chains = kids[hand].map((root) => {
      const chain = [root];
      let j = root;
      while (kids[j].length > 0) { j = kids[j][0]; chain.push(j); }
      return chain;
    });
    const bases = chains.map((c) => at(c[0]));
    const centre = bases.reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(1 / bases.length);
    const thumbIndex = bases.reduce((best, b, i) => (b.distanceTo(centre) > bases[best].distanceTo(centre) ? i : best), 0);
    const others = chains.filter((_, i) => i !== thumbIndex);
    if (others.length < 2) continue;
    const thumbBase = bases[thumbIndex];
    others.sort((a, b) => at(a[0]).distanceTo(thumbBase) - at(b[0]).distanceTo(thumbBase));
    const index = at(others[0][0]), pinky = at(others[others.length - 1][0]);
    const along = centre.clone().sub(at(wrist)).normalize();
    const across = index.clone().sub(pinky).normalize();
    // the palm's normal; a mirror image flips a cross product, so the side's sign puts it back
    const side = Math.sign(at(wrist).x) || 1;
    const palm = new THREE.Vector3().crossVectors(along, across).multiplyScalar(side).normalize();
    const middle = at((others[1] ?? others[0])[0]);
    for (const [i, chain] of chains.entries()) {
      const joints = chain.slice(0, -1);
      if (joints.length === 0) continue;
      const dir = at(chain[chain.length - 1]).sub(at(chain[0])).normalize();
      const thumb = i === thumbIndex;
      // (away from the middle finger, across the hand: for the middle finger, toward the index)
      const away = chain === (others[1] ?? others[0]) ? index.clone().sub(middle) : at(chain[0]).sub(middle);
      away.addScaledVector(dir, -away.dot(dir));
      const spread = thumb || away.lengthSq() < 1e-12 ? new THREE.Vector3() : new THREE.Vector3().crossVectors(dir, away.normalize()).normalize();
      // A finger closes toward the palm. THE THUMB folds ACROSS it, toward the little
      // finger (Joshua, 2026-10-08: "some of the fingers are bending the wrong
      // direction like the thumb"): bent straight toward the palm from where it
      // sits, it hooked down under the hand.
      const toward = thumb ? palm.clone().multiplyScalar(THUMB_TO_PALM).sub(across).normalize() : palm;
      const axis = new THREE.Vector3().crossVectors(dir, toward).normalize();
      out.push({ joints, axis, thumb, spread });
    }
  }
  return out;
}

// ------------------------------------------------------------------- the scene

export function buildSarahLabScene(ctx: SceneContext, hooks: SarahLabHooks): AppScene {
  const three = new THREE.Scene();
  three.background = new THREE.Color(0x1b2028);
  const camera = new THREE.PerspectiveCamera(LANDSCAPE_FOV, 1, 2, 4_000);
  // (a frozen tee v0.7.0 kept, let go: FROZEN_TEE_DATABASE)
  try { (globalThis as { indexedDB?: IDBFactory }).indexedDB?.deleteDatabase(FROZEN_TEE_DATABASE); } catch { /* none to let go */ }

  // the ground half of the sky light is brighter than a dark floor would give, and a soft fill comes up from in front
  // of her, low: so what is under her belly can be seen, not lost in black (Joshua, 2026-10-23: "try adding more
  // lights to see underneath better and/or raise the ambient lighting as well")
  const hemi = new THREE.HemisphereLight(0xe8eef6, 0x5a5f68, 1.35);
  const key = new THREE.DirectionalLight(0xfff2e2, 2.0);
  key.position.set(1.5 * M, 2.8 * M, 2.2 * M);
  const rim = new THREE.DirectionalLight(0xbfd8ff, 0.9);
  rim.position.set(-2 * M, 1.8 * M, -2 * M);
  const under = new THREE.DirectionalLight(0xffeedd, 0.7);
  under.position.set(0.6 * M, -1.0 * M, 2.0 * M);
  three.add(hemi, key, rim, under);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(1.4 * M, 64),
    new THREE.MeshStandardMaterial({ color: 0x2b313a, roughness: 0.95, metalness: 0 }),
  );
  floor.rotation.x = -Math.PI / 2;
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.38 * M, 1.4 * M, 64), new THREE.MeshBasicMaterial({ color: 0x4a5462 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.2;
  three.add(floor, ring);
  // the strip she walks (walkStrip.ts), in place of the floor while she walks
  const strip = new WalkStrip(M);
  three.add(strip.object);
  // a plain stool for SIT, sized when she sits on it
  const stool = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2 * M, 0.22 * M, 1, 28),
    new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.8 }),
  );
  stool.visible = false;
  three.add(stool);

  let model: THREE.Object3D | null = null;
  let rig: HumanRig | null = null;
  let measure: HumanMeasure | null = null;
  let fingers: Finger[] = [];
  let skinned: THREE.SkinnedMesh[] = [];
  let garments: Garment[] = [];
  let hasBelly = false;
  let recovered = false;
  let loaded = false;
  let failed = false;
  // ------------------------------------------------------------ loading (Joshua, 2026-10-20): what is downloading,
  // drawn by the card; each recovered file fetched when an outfit first needs it (recoveredPartsFor), its meshes kept
  // on her once fetched -- one shirt at a time -- and a shirt download for an outfit no longer wanted cancelled
  const meter = new LoadMeter();
  let card: LoadingCard | null = null;
  let cardPlace: LoadingPlace = 'centre';
  let batch = 0, readyBatch = -1, readyIn = 0;
  let retry: () => void = () => {};
  const partMeshes = new Map<RecoveredPart, THREE.SkinnedMesh[]>();
  const inflight = new Map<RecoveredPart, { promise: Promise<THREE.Object3D>; abort: AbortController }>();
  /** An outfit whose clothes are on their way; she wears `outfit` until they are on. */
  let wantedOutfit: number | null = null;
  let outfitRequest = 0;
  let disposed = false;

  let pose: SarahLabPose = 'stand';
  /** her birth area shaped (birthArea.ts); a probe can turn it off to compare */
  let birthAreaShown = true;
  /** how much of the split's shading shows (birthArea.ts `patchBirthShade`): none while anything is worn over it */
  const birthShadeU = { shade: { value: 1 }, centre: { value: new THREE.Vector3() }, rest: { value: new THREE.Matrix4() } };
  /** a birth position's own turns, and where she was set for it last (worked out again when it, her build or size changes) */
  const birthOut: MutableJointTurn[] = [];
  const LOWER_GARMENTS: readonly string[] = ['leggings', 'leggingsLow', 'bikini', 'swimsuit'];
  let birthPlaced: { key: string; position: THREE.Vector3; quaternion: THREE.Quaternion } | null = null;
  /** 0 standing, 1 fully seated: how far the thighs have taken over the bump's tilt (`effectiveTiltDeg`). */
  let seated = 0;
  /** Breast dimensions moved together, as by an aspect-ratio lock: a flag only, never a value. */
  const linked = new Set<BodyControl>();
  // she opens as Joshua set her (sarahLook.ts, 2026-10-24): 73%, her navel a little out, his tee and leggings
  let bump = SARAH_LOOK?.body.bump ?? 100;
  /**
   * HER BELLY SETTLES AS SHE LIES BACK (Joshua, 2026-11-01: "when a pregnant woman lies back... the belly appears to
   * shrink because the weight shifts more inward"; "fully laying back will shrink the belly 60% of normal... a formula
   * calculation between straight up and flat on back... lerp so it is a smooth transition and not instant... maybe over
   * 5s"). Upright the womb, baby and fluid hang forward on her belly wall; lying back they settle toward her spine and the
   * wall relaxes. Her belly is drawn at `1 - most * settle` of its size, `settle` going from 0 with her torso upright to
   * 1 with it `flatDeg` back from how she stands (flat on her back), in a straight line -- Joshua's: 2/3 of a percent of
   * her size a degree, so 30 degrees back at 100% shows 80%, 45 degrees 70%, flat 40% -- and the other way, leaning
   * forward (on her hands and knees, over a ball), her belly hangs forward and stretches out by up to `grow` of itself at
   * 90 degrees forward (Joshua's estimate, 2026-11-01: "the max could be like 30% more") -- eased there at most a whole step in `seconds`. Her sliders,
   * shape and the size she is (her week) are untouched. GAME TUNING
   */
  // (Joshua, 2026-11-03: fully back, flat on a bed, 50% less; fully forward, on hands and knees, 15% more; in between in
  // proportion -- until her belly is a soft body of its own)
  const BELLY_SETTLE = Object.freeze({ most: 0.5, grow: 0.15, flatDeg: 90, seconds: 5, step: 0.5 });
  /** how far her torso leans from upright standing as she stands (her own posture: she leans back a little), measured as she stands */
  let uprightTilt = 15;
  // (off: her soft belly's depth does this now, smoothly -- Joshua, 2026-11-03: "we can remove the automatic belly rule...
  // the soft body belly will simulate it more accurately"; a probe may still turn it on to compare)
  let bellySettle = 0, bellySettleApplied = 0, bellySettleAt = 0, bellySettleOn = false;
  /** her belly's size as drawn now: her BELLY slider's, settled as she lies back */
  // (and after a birth, her belly settling smaller as her womb shrinks back -- birthSequence.ts)
  let birthBellyShare = 1;
  const shownBump = (): number => bump * birthBellyShare * (1 - BELLY_SETTLE.most * Math.max(0, bellySettle) + BELLY_SETTLE.grow * Math.max(0, -bellySettle));
  let curl = 0;
  // v2's ARMS control can override any pose; until used, the pose keeps its natural arms.
  // v1 keeps the original T-POSE-only control and its level-arm default.
  let armsDeg = levelArmsModel(SARAH_LAB_MODELS[SARAH_LAB_DEFAULT_MODEL].id) ? 90 : 0, armSide = 0;
  let armsOverride = false;
  // The bump's spring and the breasts' (lighter, quicker), fed the same motion. The
  // bump's weight is its size's own (`bellyMotionWeights`): the WEIGHT slider that
  // added to it is gone (Joshua, 2026-10-08: "keep the current weights... just not
  // have that slider option").
  // Her belly and breasts are simulated (softBody.ts, Joshua 2026-10-29: "do belly and breast simulation"): three masses
  // -- the womb's, and each breast's own -- moving every patched mesh through `jiggle`. The baked motion shapes they
  // replaced are held at rest: the belly's tilt (its size's own weight, standing and seated) still comes from them.
  const spring = restingBellySpring();
  const masses = { belly: restingMass(), breastL: restingMass(), breastR: restingMass() };
  const jiggle = createJiggleUniforms();
  // HER SOFT BELLY (softBody.ts `BELLY_SOFT`): its three soft moves, the way down in her frame as she stands (her lean is
  // measured from it), what they last eased toward, where her front is without a bump, and a probe's held lean
  const softBelly = restingSoftBelly(), softUpright = new THREE.Vector3(0, -1, 0), softDown = new THREE.Vector3(0, -1, 0);
  let softWant: SoftBellyWant | null = null, softBaseZ: number | null = null, softHeld: { lean: number; side: number } | null = null, softOn = true;
  // food and water in her (0..1 a full meal): her belly a little firmer (Joshua, 2026-11-03: for the story -- set by a probe until then)
  let bellyFed = 0;
  // her pubic area pressed by her baby's head (softBody.ts `PUBIC_PRESS`): its spring, and where it presses (rest metres)
  const pubicPress = { x: 0, v: 0 };
  let pubicOn = true;
  let pubicCentre: THREE.Vector3 | null = null;
  // HER NAVEL IN HER SOFT BELLY (navelSoft.ts): what presses it (0..1, softBody.ts `navelPressure`), the spring that
  // carries her navel to it, its most before her baby was born and how long since (for NAVEL AFTER BIRTH)
  let navelSoft: NavelSoft | null = null, navelPress = 0, navelPeak = 0, navelBornFor = 0;
  /** The numbers her navel was last laid from (layNavel): in and all the way out, with and without her fabric's settling. */
  let navelLaid: { x: [number, number]; raw: [number, number] } | null = null;
  /** Her fitted clothes' NAVEL_FLAT weights as last set (so the frame's step moves them only when her navel moves). */
  const navelWorn = new WeakMap<THREE.Mesh, number>();
  const navelSpring = { x: 0, v: 0, primed: false };
  /** Where each mass hangs from, in a bone's frame: what it feels move. The belly in front of her spine, each breast on her chest. */
  type Anchor = { bone: THREE.Bone; local: THREE.Vector3; bind: THREE.Quaternion; p: THREE.Vector3; v: THREE.Vector3; primed: number };
  let anchors: { belly: Anchor; breastL: Anchor; breastR: Anchor } | null = null;
  // HER LEGS AS SOFT BODIES (Joshua, 2026-11-02: "a hybrid of mine and your idea"): each thigh's and calf's tissue its own
  // spring, hung from the middle of its bone (softBody.ts LEG_TUNE), and where her calf presses her thigh in SQUAT the
  // pressure building and easing as a valve (`contactNow`, birthContact.ts)
  const legMasses = { thighL: restingMass(), thighR: restingMass(), calfL: restingMass(), calfR: restingMass() };
  let legAnchors: { thighL: Anchor; thighR: Anchor; calfL: Anchor; calfR: Anchor } | null = null;
  /** her legs' bones (thigh, shin, foot each side), for their follow weights */
  const legBonesOf = (root: THREE.Object3D | null = model): LegBones | null => {
    const sk = root && findSkinnedMesh(root), j = measure?.joints;
    if (!sk || !j) return null;
    const b = sk.skeleton.bones, foot = (k: THREE.Bone) => k.children.find((c) => (c as THREE.Bone).isBone) as THREE.Bone | undefined;
    const fl = foot(b[j.kneeL]), fr = foot(b[j.kneeR]);
    return fl && fr ? { left: [b[j.hipL], b[j.kneeL], fl], right: [b[j.hipR], b[j.kneeR], fr] } : null;
  };
  /** the valve: how much of her calf-on-thigh contact is laid now (0..1, a spring toward 1 in SQUAT), and its speed */
  const contactValve = { x: 0, v: 0, applied: 0, at: 0 };
  const CONTACT_VALVE = Object.freeze({ hz: 2.2, damping: 0.55, step: 0.04 });
  /** GAME TUNING: how much of the lean's gravity her legs' tissue feels (the belly's is GRAVITY_SHARE) */
  const LEG_GRAVITY = 0.08;
  /**
   * HER BABY (baby.ts): SEE BABY shows it in her womb with her seen through. The holder rides her spine bone and is her
   * rest frame (metres) at her bind; the baby and its sac are laid in it from the womb at her size and BABY WEIGHT, the
   * belly's mass swinging them with her. Fetched the first time it is asked for.
   */
  let babyFrame: { bone: THREE.Bone; matrix: THREE.Matrix4; meshToRest: THREE.Matrix4 } | null = null;
  /** her vulva, rebuilt finer from her own skin to be able to open (vulvaMesh.ts) */
  let vulva: VulvaPatch | null = null;
  /** a probe's change to the birth position's angles (humanBirth.ts `tweak`) */
  let birthTweak: Partial<BirthSpec> | null = null;
  /** room kept between her thighs as she is posed (birthRoom.ts): the watcher, whether it is on, what it was last worked out for */
  let birthRoom: BirthRoom | null = null, birthRoomOn = false, birthRoomFor = '';
  /** her groin lit as it is bent (birthNormals.ts), and whether it is on */
  let birthNormals: BirthNormals | null = null, birthNormalsOn = true;
  /** her middle kept with her pelvis in a birth position (birthWeights.ts), and a probe's override of how much */
  let birthWeights: BirthWeights | null = null, birthMaskOverride: number | null = null;
  /** her heels kept with her feet in a birth position (ankleWeights.ts), and a probe's switch */
  let ankleWeights: AnkleWeights | null = null, ankleWeightsOn = true;
  /** each finger's skin its own, in every pose (fingerWeights.ts), and a probe's switch */
  let fingerWeights: FingerWeights | null = null, fingerWeightsOn = true;
  /** her fingers cut apart where her mesh joins them (fingerSplit.ts); `?fingers=joined` draws her as her file has them, for a probe */
  let fingerSplit: FingerSplit | null = null, fingerSplitMs = 0, fingersRoundOn = true;
  const FINGERS_ROUND_FIELD = 'shape:fingersRound', OWN_SEAM_FIELD = 'shape:fingersSeam', FINGERS_FORM_FIELD = 'shape:fingersForm';
  /** her own fingers given the finger's shape (ownFingers.ts formFingers), and a probe's switch */
  let fingersFormed = 0, fingersFormOn = true;
  const fingersJoined = typeof location !== 'undefined' && new URLSearchParams(location.search).get('fingers') === 'joined';
  /** HER OWN FINGERS past her webbing, on her bones (ownFingers.ts; Joshua, 2026-11-05: "hide the MeshyAI fingers, and
   * instead create your own cylinder fingers"; then, still not meeting her hand: "try not doing your fingers, try again the
   * default fingers and fix the weights") -- off: her file's fingers are drawn, weighted again (fingerWeights.ts);
   * `?fingers=own` draws the made ones, for a probe to compare */
  let ownFingers: OwnFingers | null = null, ownFingersOn = true, ownFingersMs = 0, withFingers: Uint32Array | null = null;
  /** her fingers' closing triangles drawn in her own colour (fingerFills.ts) */
  let fingerFills: FingerFills | null = null;
  /** her thin triangles round her hands turned (betterTris.ts): how many; GAME TUNING (metres), how far from the middle of
   * a hand's knuckles they are looked for (her wrist is about nine centimetres behind them) */
  let betterTurned = 0; const HAND_REACH = 0.11;
  const ownFingersWanted = typeof location !== 'undefined' && ['own', 'unaligned'].includes(new URLSearchParams(location.search).get('fingers') ?? '');
  /** (`?fingers=unaligned`: her own fingers as first made -- centred across their bones, not begun on her ring's middle -- for a probe to compare) */
  const ownFingersUnaligned = typeof location !== 'undefined' && new URLSearchParams(location.search).get('fingers') === 'unaligned';
  let babyFitAt = -Infinity, babyPushField: BellyPush | null = null, babyPushOff = false;
  /** BABIES and LIE: how many, and how each lies (AUTO is the commonest for so many; RANDOM is drawn again each time it is chosen) */
  let babyKeySeen = '', babyKeyAt = 0;
  let babyCount = 1, babyLie: 'auto' | Lie | 'random' = 'auto', babyLieSeed = 1, babyCurled = 1;
  /** AUTO DEPTH (percent of DEPTH, added to hers) and THE BALANCE (degrees of sag): what her babies ask of her now */
  let babyAutoDepth = 0, babyBalanceDeg = 0;
  const LIE_MODES = ['auto', 'head', 'breech', 'side', 'random'] as const;
  /** the other babies (twins, triplets): copies of the first; and each one's own sac when there is more than one */
  let babyCopies: THREE.Object3D[] = [], babyOwnSacs: THREE.Mesh[] = [];
  /** each baby's soft body (softBaby.ts); on (a probe can hold it off) */
  const softBabies = new WeakMap<THREE.Object3D, SoftBaby>();
  let babySoftOn = true;
  // (a probe's: her organs not drawn, to look at her bare bones)
  let organsOff = false;
  // (a probe's: her baby as one stiff length down her canal, as it was before 2026-11-10, to compare)
  let babyAlongOn = true;
  /** how far its body has been moved across to pass through the middle of her opening (birthPlace), eased */
  const birthCentreOffs: THREE.Vector3[] = [];
  const centreOffOf = (i: number): THREE.Vector3 => (birthCentreOffs[i] ??= new THREE.Vector3());
  /** where its head came out of her and the way it was going (her rest frame), held while the rest of it follows */
  /** each baby's way out of her, held from when its head came out (one a baby: twins come the same way, one by one) */
  const birthOutLines: ({ at: THREE.Vector3; way: THREE.Vector3; pAt?: THREE.Vector3; pWay?: THREE.Vector3 } | null)[] = [];
  const babySqueeze = createSqueezeUniforms();
  /** its skin (its model's texture) shown from the start of its birth, plain in her womb (babySkin.ts) */
  const babySkin = createSkinUniforms();
  const babyDown = new THREE.Vector3(0, -1, 0);
  /** how her hands' reach onto her knees went last (reclined) */
  let kneeHold: { L: number; R: number; holding: boolean; [k: string]: number | boolean } | null = null;
  /** P2: her hands to her baby on her ('hands', the default once it is born) or left on her knees ('knees'); and how far
   * they have come to it (0..1, eased over BABY_HANDS.seconds) */
  let babyHold: 'hands' | 'knees' | 'cradle' = 'hands', babyHoldShare = 0;
  /** twins (P3): her right hand's share on the second twin, which lies on her right once it is born (0 .. 1) */
  let twinHandShare = 0;
  /** P2, POSITION B: how far her baby is turned into the cradle of her arms (0 lying on her .. 1 cradled, eased over
   * BABY_CRADLE.seconds) */
  let cradleShare = 0;
  /** each baby's straight body (BABY_STRAIGHT_MODEL), kept out of `userData` so a clone of it does not serialise a mesh */
  const babyStraight = new WeakMap<THREE.Object3D, THREE.SkinnedMesh>();
  /** THE BALANCE's weight on her tilt shape now: its degrees on the TILT scale, carried by her thighs as she sits as her own tilt is. */
  function balanceTiltWeight(): number {
    return babyBalanceDeg ? (babyBalanceDeg * (effectiveTiltDeg(SIZE_TILT_PRESETS_DEG[2], seated) / SIZE_TILT_PRESETS_DEG[2]) * Math.PI) / 180 / BELLY_MOTION.tiltRad : 0;
  }
  /** Her DEPTH field's weight for one percent of DEPTH at her size now (the field is relative to the bump shown). */
  /** Whether something is worn over her birth area now: a modelled bottom, or a painted bottom or one-piece (never in a birth position). */
  /**
   * Whether something is drawn over her birth area now (Joshua, 2026-10-31: the leggings looked "like someone ripped
   * her leggings"): a bottom worn and shown -- painted on her or modelled -- outside a birth position. Then her rebuilt
   * area is drawn with her own material, its lips lying as her skin does (vulvaMesh.ts setDressed).
   */
  function vulvaDressed(view: string): boolean {
    if (bottomsOff() || view !== 'all') return false;
    return lowerCovered() || skinned.some((m) => m.visible && m.userData.recoveredLeggings);
  }
  /**
   * Her bottoms are off only while a birth is under way in a birth position (Joshua, 2026-11-03: "don't hide her bottom
   * clothes for any pose... but you can temporarily hide her bottom clothes when the birth plays"); RECLINE or SQUAT on
   * their own keep what she wears. Begun means BIRTH ▶ or the TIMELINE, paused or not, until RESET.
   */
  function bottomsOff(): boolean { return isBirthPose(pose) && birthClock !== null; }
  function lowerCovered(): boolean {
    if (bottomsOff()) return false;
    return wornGarments(outfit, garments).some((g) => LOWER_GARMENTS.includes(g)) || !!fabric?.coversLower();
  }
  function depthUnit(): number { return bodyShapeFieldWeights({ ...body, bellyDepth: 1 }, bump, bellyCurve)[DEPTH_FIELD] ?? 0; }
  function babyLies(): Lie[] {
    if (babyLie === 'auto') return [...AUTO_LIES[babyCount]];
    if (babyLie !== 'random') return Array.from({ length: babyCount }, () => babyLie as Lie);
    // drawn from the commonest: head down most, breech some, sideways a few
    let seed = babyLieSeed * 9301 + 49297;
    return Array.from({ length: babyCount }, () => { seed = (seed * 9301 + 49297) % 233280; const r = seed / 233280; return r < 0.6 ? 'head' : r < 0.85 ? 'breech' : 'side'; });
  }
  /** Every baby drawn: the first and its copies. */
  const babyRoots = (): THREE.Object3D[] => (babyRoot ? [babyRoot, ...babyCopies] : []);
  let babyWall: THREE.Mesh | null = null, babyDirty = true, babySkinAt: Uint32Array | null = null, babyWomb: WombShape | null = null;
  /** each of `bellySkin`'s points' move for one unit of her DEPTH field (rest metres); that field's entries by vertex */
  let babySkinDepth: Float32Array | null = null, babyDepthOf: Map<number, number> | null = null;
  const DEPTH_FIELD = 'shape:bellyDepth';
  let babyRoot: THREE.Object3D | null = null, babyHolder: THREE.Object3D | null = null, babySac: THREE.Mesh | null = null;
  let babyShown = false, babyLoading = false, babyKey = '';
  /** PREGNANT (P5): is she -- on or off, nothing else (her weeks are typed: `pregnancy`, below) */
  const pregnant = (): boolean => pregnancy.pregnant;
  /** the % of the chart her belly stands for, off her own chart (baby.ts `chartBump`): `b` itself while nothing is typed */
  const onChart = (b = bump): number => chartBump(b, babyCount, pregnancy);
  // HER BABY'S BIRTH (birthSequence.ts): its clock (null: not begun), whether it runs, its pace, where it is now, her
  // canal as drawn this frame, and her baby's head's middle (its model's units)
  let birthTimeInput: HTMLInputElement | null = null;
  let birthClock: number | null = null, birthRunning = false, birthPace: BirthPace = 'fast', birthNow: BirthMoment | null = null;
  /** CUT CORD and DELIVER PLACENTA, as moments on the birth's clock (FAST seconds; null: on their own time); with twins
   * and triplets every CUT CORD pressed is kept (`cuts`: each press cuts every cord out of her by then) */
  const birthEvents: { cutAt: number | null; cuts: number[]; placentaAt: number | null } = { cutAt: null, cuts: [], placentaAt: null };
  /** the birth's clock in FAST seconds */
  const birthFast = (): number => (birthClock ?? 0) / (birthPace === 'realistic' ? REALISTIC_STRETCH : 1);
  /** a moment asked for later than where the timeline now stands has not happened yet (dragged back before it) */
  function trimBirthEvents(): void {
    const t = birthFast() + 1e-6;
    if (birthEvents.cutAt !== null && birthEvents.cutAt > t) birthEvents.cutAt = null;
    birthEvents.cuts = birthEvents.cuts.filter((c) => c <= t);
    if (birthEvents.placentaAt !== null && birthEvents.placentaAt > t) birthEvents.placentaAt = null;
  }
  /** her baby born (resting, its cord cut or not, the placenta coming or come) -- with twins and triplets, the one before
   * the next one's turn as well */
  const bornStage = (m: BirthMoment | null): boolean => !!m && (m.stage === 'after' || m.stage === 'afterbirth');
  /**
   * TWINS AND TRIPLETS (P3): baby `i`'s own birth read as a whole moment -- its place, its cord, its placenta -- for the
   * code that lays one baby (birthPlace, layCords). With one baby it is the moment itself.
   */
  function momentOf(i: number): BirthMoment | null {
    const m = birthNow, b = m?.babies[i];
    if (!m || !b) return null;
    if (m.count === 1) return m;
    const p = m.placentas[i] ?? { placentaFor: -1, separate: 0, placentaDown: 0, bowl: 0 };
    return { ...m, engage: b.engage, down: b.down, turnDeg: b.turnDeg, shoulderTiltDeg: b.shoulderTiltDeg, onHer: b.onHer, stretch: b.stretch, closing: b.closing, cut: b.cut, cutAt: b.cutAt, placentaFor: p.placentaFor, separate: p.separate, placentaDown: p.placentaDown, bowl: p.bowl };
  }
  /**
   * THE SQUAT BIRTH (P3b; Joshua, 2026-11-04: she catches her baby in her own hands, then "sits back on the mat"): how far
   * she has sat back from her squat onto the mat (0 .. 1) -- as her first baby is lifted to her chest (its `onHer`).
   * 0 in any other position, and before.
   */
  const squatSit = (): number => {
    if (pose !== 'squat' || !birthNow) return 0;
    // (once her baby is part of the way up to her chest: SQUAT_CATCH.sitFrom)
    const t = Math.min(1, Math.max(0, ((birthNow.babies[0]?.onHer ?? 0) - SQUAT_CATCH.sitFrom) / (1 - SQUAT_CATCH.sitFrom)));
    return t * t * (3 - 2 * t);
  };
  /** Every baby out of her (one baby: born). */
  const allOut = (m: BirthMoment | null): boolean => !!m && m.babies.every((b) => b.born);
  /** A baby whose birth has reached it: the first from the start; another once it starts turning head down for its turn. */
  const birthReaches = (i: number): boolean => i === 0 ? !!birthNow : (birthNow?.babies[i]?.lieTurn ?? 0) > 0;
  let birthPath: { points: THREE.Vector3[]; down: number[]; length: number } | null = null, birthHeadModel: THREE.Vector3 | null = null, birthLineAt = 0, birthLen: number | null = null;
  let babyCurl: CurlFrame | null = null, babyPoints: Float32Array | null = null, babyAll: Float32Array | null = null;
  /** the baby's body as a solid (baby.ts `babySolid`), found once from its points: how babies are kept out of one another */
  let babySolidOf: BabySolid | null = null;
  /** IN THEIR FLUID: each baby's mass, the room round it as packed (rest metres), the clock its drift runs on, what her belly felt last */
  let babyFloats: Mass[] = [], babyRooms: number[] = [], babyClock = 0;
  /**
   * KICKS AND MOVES (baby.ts `MOVES`): each baby's move under way (`t` seconds in; below 0, none), the next and how long
   * until it, its own random source, and its bones as its curl has them.
   */
  interface BabyMove { kind: MoveKind; side: 'left' | 'right'; t: number; next: number; pending: MoveKind; rnd: () => number; bones: Map<string, THREE.Bone>; rest: Map<string, THREE.Quaternion>; posed: boolean }
  let babyMoves: BabyMove[] = [], babyCurlRest: Map<string, THREE.Quaternion> | null = null;
  /**
   * THE CORD AND THE PLACENTA (baby.ts): its navel (the trunk bone it rides, where on it, and where it is in the curl,
   * model units), each baby's placenta and cord, and what draws them (SEE BABY only: nothing of it shows from outside).
   */
  let babyNavel: { model: THREE.Vector3 } | null = null;
  /** its navel followed on each of its bodies (BABY_NAVEL): the points of its knot and of the skin round it, by geometry
   * (its curled body's and its straight one's, and a twin's, which shares its curled one's) */
  const navelPicks = new WeakMap<THREE.BufferGeometry, { knot: Uint32Array; ring: Uint32Array }>();
  /**
   * ITS CORD CUT (Joshua, 2026-11-03: "Keep it at first but then either have it automatically be cut or manual button so
   * it can be used in the game later"): once its navel is out of her its cord runs in two -- inside her from its placenta
   * to her opening (drawn with SEE BABY, as before), and outside from her opening to its navel, hanging (always drawn:
   * it is outside her) -- until CUT CORD, or birthSequence.ts `cutAfter` after it is settled on her; then a stump on its navel.
   */
  let cordOuter: Cord | null = null, cordStump: Cord | null = null, cordOuterMesh: THREE.Mesh | null = null, cordStumpMesh: THREE.Mesh | null = null;
  let cordCut = false, cordOuterLaid = false, cordStumpLaid = false;
  /** and once cut, the rest of it hanging out of her (from her opening, then from the placenta as it comes out) */
  let cordRemnant: Cord | null = null, cordRemnantMesh: THREE.Mesh | null = null, cordRemnantLaid = false;
  /**
   * TWINS AND TRIPLETS (P3): each baby's cord out of her is its own -- its outside cord, stump and the cut cord hanging out
   * of her. The single-cord code above runs for one baby at a time: `useCordOf(i)` loads baby i's into it and
   * `keepCordOf(i)` puts it back (the first baby's stays loaded between frames, which is what one baby always had).
   */
  interface CordOut { outer: Cord | null; stump: Cord | null; remnant: Cord | null; outerMesh: THREE.Mesh | null; stumpMesh: THREE.Mesh | null; remnantMesh: THREE.Mesh | null; outerLaid: boolean; stumpLaid: boolean; remnantLaid: boolean; cut: boolean }
  const cordOuts: CordOut[] = [];
  function useCordOf(i: number): void {
    const c = (cordOuts[i] ??= { outer: null, stump: null, remnant: null, outerMesh: null, stumpMesh: null, remnantMesh: null, outerLaid: false, stumpLaid: false, remnantLaid: false, cut: false });
    cordOuter = c.outer; cordStump = c.stump; cordRemnant = c.remnant; cordOuterMesh = c.outerMesh; cordStumpMesh = c.stumpMesh; cordRemnantMesh = c.remnantMesh;
    cordOuterLaid = c.outerLaid; cordStumpLaid = c.stumpLaid; cordRemnantLaid = c.remnantLaid; cordCut = c.cut;
  }
  function keepCordOf(i: number): void {
    const c = cordOuts[i]; if (!c) return;
    c.outer = cordOuter; c.stump = cordStump; c.remnant = cordRemnant; c.outerMesh = cordOuterMesh; c.stumpMesh = cordStumpMesh; c.remnantMesh = cordRemnantMesh;
    c.outerLaid = cordOuterLaid; c.stumpLaid = cordStumpLaid; c.remnantLaid = cordRemnantLaid; c.cut = cordCut;
  }
  const remnantWay = new THREE.Vector3(), placentaFace = new THREE.Vector3();
  const navelWay = new THREE.Vector3(), navelV = new THREE.Vector3(), navelRing = new THREE.Vector3(), cordOpen = new THREE.Vector3(), cordDown = new THREE.Vector3(), cordToward = new THREE.Vector3();
  const holderInv = new THREE.Matrix4(), offHerAt = new THREE.Vector3(), offHerN = new THREE.Vector3();
  /** Its knot's points and the skin round it, on a body at its rest (as skinned at rest: `spot` from BABY_NAVEL). */
  function pickNavel(mesh: THREE.SkinnedMesh, spot: { readonly at: readonly number[]; readonly out: readonly number[] }): void {
    const at = new THREE.Vector3().fromArray(spot.at), out = new THREE.Vector3().fromArray(spot.out).normalize(), v = new THREE.Vector3(), N = BABY_NAVEL;
    const knot: number[] = [], ring: number[] = [], n = mesh.geometry.getAttribute('position').count;
    mesh.updateMatrixWorld(true);
    for (let i = 0; i < n; i++) {
      mesh.getVertexPosition(i, v).applyMatrix4(mesh.matrixWorld).sub(at);
      const h = v.dot(out), d = Math.sqrt(Math.max(0, v.lengthSq() - h * h));
      if (d < N.knot && h > -0.004 && h < 0.03) knot.push(i);
      else if (d > N.ring[0] && d < N.ring[1] && Math.abs(h) < 0.015) ring.push(i);
    }
    navelPicks.set(mesh.geometry, { knot: Uint32Array.from(knot), ring: Uint32Array.from(ring) });
  }
  /** Its navel now (world) on whichever of its bodies is drawn, and the way out of its belly there; false if not known. */
  function navelNow(r: THREE.Object3D, at: THREE.Vector3, way: THREE.Vector3): boolean {
    const own = babyStraight.get(r);
    let mesh: THREE.SkinnedMesh | null = own && own.visible && (own.userData.share ?? 0) >= 0.5 ? own : null;
    if (!mesh) r.traverse((o) => { const m = o as THREE.SkinnedMesh; if (!mesh && m.isSkinnedMesh && m !== own) mesh = m; });
    const m = mesh as THREE.SkinnedMesh | null, pick = m ? navelPicks.get(m.geometry) : undefined;
    if (!m || !pick || pick.knot.length === 0 || pick.ring.length === 0) return false;
    at.set(0, 0, 0); navelRing.set(0, 0, 0);
    for (const i of pick.knot) at.add(m.getVertexPosition(i, navelV));
    for (const i of pick.ring) navelRing.add(m.getVertexPosition(i, navelV));
    m.localToWorld(at.divideScalar(pick.knot.length)); m.localToWorld(navelRing.divideScalar(pick.ring.length));
    way.subVectors(at, navelRing).normalize();
    return true;
  }
  /** CUT CORD: once its navel is out of her (false before, and nothing cut) -- a moment on the birth's clock, so the
   * timeline dragged back before it has not cut it yet (birthSequence.ts `BirthEvents`). */
  function cutCord(): boolean {
    if (!birthNow) return false;
    if (birthNow.count === 1) {
      if (birthNow.down < 1 + BABY_NAVEL.fromCrown) return false;
      if (!birthNow.cut) birthEvents.cutAt = birthFast();
      return true;
    }
    // (twins and triplets: every cord out of her by now that is not cut yet)
    const out = birthNow.babies.filter((b) => b.down >= 1 + BABY_NAVEL.fromCrown);
    if (!out.length) return false;
    if (out.some((b) => !b.cut)) birthEvents.cuts.push(birthFast());
    return true;
  }
  /** DELIVER PLACENTA: sooner than its own time, once its cord is cut (false before, and nothing asked) -- a moment on the
   * birth's clock, like CUT CORD. */
  function deliverPlacenta(): boolean {
    // (every baby out and its cord cut: the placentas come after the last)
    if (!birthNow || !birthNow.babies.every((b) => b.cut)) return false;
    if (birthNow.placentaFor < 0) birthEvents.placentaAt = birthFast();
    return true;
  }
  let babyPlacentas: PlacentaSpot[] = [], babyCords: Cord[] = [], cordLaid: boolean[] = [], cordMeshes: THREE.Mesh[] = [], placentaMeshes: THREE.Mesh[] = [], babyStepDt = 0;
  const cordMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0 }), placentaMat = new THREE.MeshStandardMaterial({ color: 0x8e2f3c, roughness: 0.6, metalness: 0 });
  const navelAt = new THREE.Vector3(), cordA = new THREE.Vector3();
  const moveTip = new THREE.Vector3(), moveAt = new THREE.Vector3(), moveOut = new THREE.Vector3(), moveRoll = new THREE.Quaternion(), moveAxis = new THREE.Vector3();
  const moveFrame = { long: new THREE.Vector3(), front: new THREE.Vector3(), left: new THREE.Vector3(), out: new THREE.Vector3() }, moveQ = new THREE.Quaternion();
  function babyMoveOf(i: number, root: THREE.Object3D): BabyMove {
    let m = babyMoves[i];
    if (m && m.bones.get(BABY_BONES.root) && isUnder(m.bones.get(BABY_BONES.root)!, root)) return m;
    const bones = new Map<string, THREE.Bone>();
    root.traverse((n) => { if ((n as THREE.Bone).isBone) bones.set(n.name, n as THREE.Bone); });
    // its curl, as the model has it (taken from the first baby when it came: a copy made mid-move would hold the move)
    const rest = babyCurlRest ?? new Map<string, THREE.Quaternion>();
    let seed = 1013 * (i + 1);
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    m = { kind: 'kick', side: 'left', t: -1, next: Infinity, pending: 'kick', rnd, bones, rest, posed: true };
    babyMoves[i] = m;
    return m;
  }
  /** Start a baby's move now (KICK, a probe), or its next one when it is due. */
  function startMove(m: BabyMove, kind: MoveKind, side?: 'left' | 'right'): void {
    m.kind = kind; m.t = 0;
    if (side) { m.side = side; return; }
    // mostly the leg or arm nearer her front (the one free to reach her belly), sometimes the other
    const chain = kind === 'punch' ? BABY_BONES.arm : BABY_BONES.leg, z = (s: 'left' | 'right') => { const b = m.bones.get(chain[s][3]); return b ? b.getWorldPosition(moveTip).applyQuaternion(moveRoll.copy(babyHolder?.getWorldQuaternion(moveQ) ?? moveQ.identity()).invert()).z : 0; };
    const nearer = z('left') >= z('right') ? 'left' : 'right';
    m.side = m.rnd() < 0.75 ? nearer : nearer === 'left' ? 'right' : 'left';
  }
  const feltBelly = new THREE.Vector3(), floatMove = new THREE.Vector3(), floatAxis = new THREE.Vector3(), floatTurn = new THREE.Quaternion(), floatAt = new THREE.Vector3();
  const GHOST_OPACITY = 0.26;
  const tmp = new THREE.Vector3();
  // she opens in her red light spandex tee over painted leggings (Joshua, 2026-10-23), one small file; a model without
  // the v2 clothes (v1) falls back to the first modelled outfit it has as it loads
  // ...and since 2026-10-27 in the NEW TEE (Joshua: "Make the new shirt the default"): her look was saved in the light
  // tee's cloth copy, which is now the second option, so it opens in the new tee, with the look's own fabrics
  const lookOutfit = OUTFITS.findIndex((o) => o.name === SARAH_LOOK?.clothes.outfit);
  let outfit = lookOutfit >= 0 && lookOutfit !== SIM_TEE_OUTFIT ? lookOutfit : SARAH_DEFAULT_OUTFIT;
  let modelIndex = SARAH_LAB_DEFAULT_MODEL;
  // the body's own proportions (Joshua, 2026-10-15): all approved values to start, so she
  // looks exactly as approved until a control moves
  let body: BodyShape = SARAH_LOOK ? parseShape(SARAH_LOOK.body.shape) : defaultBodyShape();
  // HER PREGNANCY (pregnancy.ts, Joshua 2026-11-05): PREGNANT on or off and her weeks as typed, kept with her body
  let pregnancy: Pregnancy = SARAH_LOOK ? pregnancyOf(SARAH_LOOK.body) : PREGNANCY_DEFAULT;
  let shaped: { mesh: THREE.SkinnedMesh; fields: ShapeFields }[] = [];
  // HER BUILD (Joshua, 2026-10-26: "a height adjuster so you can raise or shorten the length of the legs, hips, arms,
  // hands and more basic body controls"; actor/bodyBuild.ts, view/bodyBuild.ts): measured on her approved v2 body once
  // it is in. Every mesh on her skeleton has its stretch worked out the first time a build needs it; her bones take the
  // build's offsets and sizes, and standing she is lifted so her soles stay on the floor
  let buildRig: BuildRig | null = null;
  const buildFields = new WeakMap<THREE.SkinnedMesh, BuildMeshFields>();
  let bonesBuilt = '';
  /** Her feet while she walks (`feetFor`, `stepFeet`). */
  let walkFeet: WalkFeet | null = null;
  /** Her pelvic organs (pelvicOrgansView.ts): on her skeleton (v3), and inside v2 once X-RAY is first raised. */
  let organs: PelvicOrgansView | null = null;
  /**
   * WHOSE WOMB SHE HAS (the new direction, Joshua 2026-11-09: "everything except for the birth womb is going to be copied
   * over... we are going to use the existing womb and design we have in v2"). On her skeleton her organs grow her womb for
   * HER WEEKS and carry her babies (true); in v2 her womb is her body's own, and her organs only make room for it.
   */
  let organsGrowWomb = false;
  /** Her belly's organs (abdomenView.ts: stomach, intestines, colon, rectum, kidneys), and what her gut holds
   * (actor/gut.ts: the room sets it by hand; the NPC brain later by time). */
  let abdomen: AbdomenView | null = null;
  /** Her lungs, heart and diaphragm (thoraxView.ts), in her rib cage as her bones give it (src/data/thorax/v2.json). */
  let thorax: ThoraxView | null = null;
  let abdomenFailed = false, thoraxFailed = false;
  let gut: GutState = restingGut();
  let stomachInput: HTMLInputElement | null = null, bowelInput: HTMLInputElement | null = null, bladderInput: HTMLInputElement | null = null;
  /** v2: her spine's bones each with her rest frame as it carries it, read at her bind (her organs hang from them), and
   * her organs laid in her when X-RAY is first raised (they are only seen then). */
  let v2OrganBones: Record<'pelvis' | 'lumbar' | 'upper' | 'chest', { bone: THREE.Bone; matrix: THREE.Matrix4 }> | null = null;
  /**
   * WHOSE OPENING SHE HAS in v2 (the new direction's step 3, Joshua 2026-11-09: "from the cervix to the vagina opening,
   * leave what v3 (skeleton) did with the opening work we did, the womb and the giant balloon style look under the skin
   * of v2, leave as is"; the plan: "v2's old opening stays switchable until Joshua approves the new one"). On: her
   * skeleton's doors and canal, at her own skin's opening, her skin round them a little darker and fading out
   * (`OPENING_LOOKS`); her womb, and her skin opening round the doors, stay v2's. Off: v2's opening as it was.
   */
  let skeletonOpening = true;
  // (her own skin's tone, no darker: Joshua, 2026-11-11, of her doors' darker tone against her skin: "let's match the
  // opening to the skin and it looks weird" -- the last of OPENING_LOOKS; the three before it are his choices of the 9th)
  let openingLook = 3;
  /** v2's own womb as last laid (baby.ts WombShape; null: not pregnant), for her organs to make room for */
  let v2Womb: WombShape | null = null;
  /** The treadmill's slope under STAND and WALK (`setSlope`). */
  let slope: StageSlope = { deg: 0, heading: 'ahead' };
  /** BALANCE TEST on (`measureBalance`), and what it measured last. */
  let balanceOn = false;
  let stageBalance: { com: P3; heading: P2; speed: number; outline: P2[]; margin: number; nearest: P2 | null; kg: number; body: BodyPoints; womb: P3 } | null = null;
  /** The stage's own clock (seconds, as her feet are stepped) and her centre of mass when it was last read, along the strip
   * (metres: where she is drawn, plus how far she has walked), for its speed. */
  let stageClock = 0, balanceWas: { t: number; x: number; z: number; vx: number; vz: number } | null = null;
  /** Which feet were on the floor when last read, and her balance as her last foot came down (walking). */
  let balanceDown: boolean[] | null = null, balanceStep: { margin: number; nearest: P2 | null; heading: P2; given: P2[]; com: P2 } | null = null;
  let standLift = 0;
  /** What the walk's weight moved her by this frame, room units (`weighOnFloor`); her soft parts feel her motion without it. */
  const walkOffset = new THREE.Vector3();
  /**
   * HER SNEAKERS (sneakers.ts; Joshua, 2026-11-07): built round her own foot the first time they are put on, carried by
   * her skeleton like her skin; standing, she is lifted onto their soles. Only on her approved v2 body (her build's rig).
   * ON when the room opens (Joshua, 2026-11-07: "can the default have shoes shown?"), and for any character or outfit
   * saved without a word on her shoes; one saved without them keeps her bare feet. Never in a bake (`?bake=`): the
   * story's and the outfit pictures' files are baked as they were.
   */
  let sneakers: Sneakers | null = null, sneakersOn = !new URLSearchParams(globalThis.location?.search ?? '').get('bake');
  /** The body her sneakers were last made for (or tried for): put on before she loaded, they are made once she has. */
  let sneakersFor: THREE.Object3D | null = null;
  /** Her steps on a tile floor in her sneakers (footsteps.ts): which heel came down when, and the sound of it. */
  const stepWatch = new StepWatch(), tileSteps = new TileSteps();
  let stepsHeard = 0;
  /** Her sneakers shown now: on, and not in a birth position. */
  const sneakersShown = () => sneakersOn && !!sneakers && !isBirthPose(pose);
  function setSneakers(on: boolean): void {
    sneakersOn = on;
    // (barefoot, her feet are fitted over her foot bones: her skeleton laid if it is not yet)
    if (!on) skeletonV2Lay?.();
    // (put on by a tap, the sound of her steps can start now)
    if (on) tileSteps.unlock();
    if (on && !sneakers && buildRig && measure && model) {
      sneakersFor = model;
      const b = bodyOf(), s = b ? shaped.find((x) => x.mesh === b.mesh) : undefined;
      if (b && s) {
        try { sneakers = new Sneakers(b.mesh, s.fields.basePos, restOfMesh(b.mesh, model), [measure.joints.ankleL, measure.joints.ankleR]); } catch (error) { console.error('[sarahlab] her sneakers could not be made', error); sneakers = null; }
      }
    }
    if (sneakers) sneakers.visible = sneakersShown();
    if (buttons.sneakers) buttons.sneakers.textContent = `SNEAKERS · ${sneakersOn ? 'ON' : 'OFF'}`;
    // (standing on their soles now, or off them -- laid again even at her approved build, whose key is '')
    bonesBuilt = STALE_BUILD; layBuildBones(currentBuild());
  }
  let buildBox: HTMLElement | null = null;
  let babyNote: HTMLElement | null = null;
  // her crease under her breasts, untangled where her summed shapes fold it (bodyCrease.ts); the spring's shapes move
  // every frame and are not part of what it was worked out for
  const crease = new BodyCrease([BELLY_MOTION.tilt, BELLY_MOTION.bob, BELLY_MOTION.sway, BREAST_TARGETS.bob]);
  // laid after the room summed her: the cleavage bridge chooses its ends on her repaired skin
  crease.onLaid = () => fabric?.reshaped();
  // ...and looked for on her shape as her build's bones carry it at rest (bodyCrease.ts `shift`)
  crease.shift = (mesh, vertices) => buildShift(mesh as THREE.SkinnedMesh, vertices);
  let creaseTimer = 0;
  // a probe's switch: her crease left as summed, to compare
  let creaseDisabled = false;
  const bodyInputs = new Map<BodyControl, HTMLInputElement>();
  const shownNow = (g: Garment) => wornGarments(outfit, garments).includes(g);
  let turning = false;
  // v2's switchable curve refinement (CURVE), off: her master as modelled
  let refine = false;
  // RANDOMIZE's ranges and locks (`actor/bodyRandom.ts`; Joshua, 2026-10-22), saved with her body
  let randomRules: RandomRules = NO_RULES;
  let rangesShown = false;
  const lockButtons = new Map<string, HTMLButtonElement>();
  const rangeRows: { spec: RandomSpec; row: HTMLElement; lo: HTMLInputElement; hi: HTMLInputElement }[] = [];
  let bumpInput: HTMLInputElement | null = null;
  /** the BIRTH OPENING slider (percent, 0 closed .. 100 the full 10 cm) */
  let birthOpenInput: HTMLInputElement | null = null, birthOpenPct = 0, birthBulgeInput: HTMLInputElement | null = null, birthBulgePct = 0;
  let foldBackInput: HTMLInputElement | null = null, foldBackPct = 0;
  let xrayInput: HTMLInputElement | null = null, xrayPct = 0;
  /** v2: her skeleton inside her (skeletonInV2.ts; the plan's new direction, step 1), and the load it waits on */
  /** v2: her bare feet's field over her foot bones (footCover.ts), and how far it moved her skin most (mm) */
  /**
   * HER SKIN ROUND HER SKELETON'S OPENING (Joshua, 2026-11-09: "probably the more natural skin tone fading out"; the plan:
   * "a natural, slightly darker tone that fades out into v2's skin"): looks to choose between. `tint` is a colour times
   * her own skin at the opening's edge, fading to her own over `reach` metres; `lips` how much of v2's own rounded lips'
   * shape stays in her skin beside the doors (0: her skin as it lies); `skin` her skin's own colour there, for the doors'
   * outer faces (MEASURED off a render of her bare skin beside her opening). All GAME TUNING but `skin`.
   */
  /** v2: her doors' size shut, of their full size (pelvicOrgansView.ts restScale): what lies between her thighs; and how
   * far BIRTH OPENING has opened her before they are drawn (`doorsSeen`); their lining's colour beside her own skin (a
   * quieter pink than on her bare skeleton). GAME TUNING. */
  const V2_DOORS = Object.freeze({ restScale: 0.55, from: 0.03, lining: 0xb5656e });
  const OPENING_LOOKS = [
    { name: 'A · a shade darker, close in', tint: [0.9, 0.82, 0.8], reach: 0.025, lips: 0, skin: [0.88, 0.66, 0.58] },
    { name: 'B · darker and warmer, wider', tint: [0.84, 0.72, 0.7], reach: 0.04, lips: 0, skin: [0.88, 0.66, 0.58] },
    { name: "C · as B, with v2's rounded lips kept", tint: [0.84, 0.72, 0.7], reach: 0.04, lips: 1, skin: [0.88, 0.66, 0.58] },
    { name: "D · her own skin's tone, no darker", tint: [1, 1, 1], reach: 0.025, lips: 0, skin: [0.88, 0.66, 0.58] },
  ] as const;
  /** The rig's own bones her organs hang from, bottom to top: her pelvis, her lumbar spine below and above L3, her chest. */
  const ORGAN_SPINE = ['Bone_001', 'Bone_004', 'Bone_003', 'Bone_002'] as const;
  /** Her pelvis lifted onto v2's own hip joints, her trunk shorter above it (skeletonInV2.ts LimbFit.trunk); a probe turns
   * it off (`?trunk=file`) to set the two against each other. */
  const SKELETON_TRUNK_ON_HIPS = new URLSearchParams(globalThis.location?.search ?? '').get('trunk') !== 'file';
  const FOOT_COVER_FIELD = 'shape:foot:cover', FOOT_COVER_BELOW = 0.16;
  /** how far her foot bones may be slid into her bare foot before her skin covers the rest, metres. GAME TUNING. */
  const FOOT_SLIDE_MOST = 0.01;
  /**
   * Her foot bones set into her foot (Joshua, 2026-11-09: forward "just a little bit", "shift down a little bit and angled
   * slightly upward with the heel down"): turned heel-down about her ankle and moved forward and down. GAME TUNING, from the
   * renders (the toes had about 2-3 cm of room ahead; the heel bone stood high, a 26 mm gap under it where a heel pad is
   * about 15-20 mm).
   */
  const FOOT_SET = Object.freeze({ pitchDeg: -6, shift: [0, -0.008, 0.014] as [number, number, number] });
  let footCoverMm = 0;
  /** v2: lays her skeleton when first wanted (X-RAY raised, her sneakers off, a probe asks) */
  let skeletonV2Lay: (() => void) | null = null;
  /** v2's own pelvis joint at bind, her rest frame (metres): what her carried landmark files are told as `joint` */
  let skeletonV2PelvisJoint: number[] | null = null;
  let skeletonV2: SkeletonInV2 | null = null, skeletonV2Request = 0, relaySkeletonV2: ((wholeScale: (number | null)[] | null) => void) | null = null;
  /** her lowest buttocks pressed in in a birth pose (a probe may turn it off to compare) */
  let birthSeatOn = true;
  /** in SQUAT the same skin rounded OUT instead (negative: out; Joshua, 2026-10-31: there it "pinches right in the
   * middle and maybe also is bowed inwards instead of outwards") */
  let birthSeatSquat = 0;
  /** her thighs moved out beside her vulva in a birth pose (birthGap.ts); a probe may turn it off to compare */
  let birthGapOn = true;
  /** the hollows under her filled in a birth pose (birthNormals.ts `fill`), by pose; a probe may set them */
  let birthFillSquat = 0, birthFillRecline = 0;
  /** in SQUAT, how much of her lower buttocks is carried by her pelvis (a probe may set it) */
  let squatBack = 0;
  /** in SQUAT, how far her down-facing underside goes to where her pelvis would carry it (birthNormals.ts `pull`) */
  let squatPull = 0.9;
  /** the hip's half-turn chosen by pose (a probe that sets it takes over) */
  let halfByPose = true;
  /** her knees smoothed as posed in a birth pose (BIRTH_KNEES_FIELD; a probe may turn it off) */
  // her calf pressed flat to her thigh in SQUAT, not through it (birthContact.ts)
  // her knees turned round, not averaged, in RECLINE (kneeTurn.ts; off in SQUAT -- Joshua, 2026-11-04, of her squatting
  // legs with it and without: "I like the second look... it looks natural", turned round her calf stood off her thigh)
  let kneeTurn: KneeTurn | null = null, kneeTurnOn = true;
  const kneeTurnHere = (): boolean => isBirthPose(pose) && pose !== 'squat' && kneeTurnOn && !!kneeTurn;
  // her hips turned round, not averaged, in RECLINE (hipTurn.ts; SQUAT is as Joshua likes it)
  let hipTurn: HipTurn | null = null, hipTurnOn = true;
  const hipTurnHere = (): boolean => pose === 'recline' && hipTurnOn && !!hipTurn;
  let birthContact: BirthContact | null = null, birthContactOn = false; // (off: 2026-11-02, its knee pass crumpled the knee -- the springs stay on)
  let birthKnees: BirthNormals | null = null, birthKneesOn = true, kneeRestore: number = KNEE_SMOOTH.restore;
  // the library outfit she last put on (her changes to it save as hers), and saved clothes waiting for their outfit to load
  let wornFrom: string | null = null;
  // ...and in his fabrics, put on as her outfit is dressed the first time
  let pendingClothes: Omit<SavedClothes, 'outfit'> | null = SARAH_LOOK ? (({ outfit: _name, ...rest }) => rest)(SARAH_LOOK.clothes) : null;
  let characters: CharacterPanel | null = null;
  // the outfit editor's SAVE workspace, and where the clothes going on now came from (a character, a shared outfit, a
  // new one); null is the built-in outfit itself
  let outfits: OutfitPanel | null = null;
  let nextSource: OutfitSource | null = null;
  let sessionBook: CharacterBook = EMPTY_BOOK;
  const book = hooks.characters ?? { read: () => sessionBook, write: (b: CharacterBook) => { sessionBook = b; } };
  let seconds = 0;
  let walked = 0;
  const poseOut: MutableJointTurn[] = Array.from({ length: Math.max(HUMAN_POSE_TURNS, SEATED_TURNS) }, newJointTurn);
  const standOut: MutableJointTurn[] = Array.from({ length: Math.max(HUMAN_POSE_TURNS, SEATED_TURNS) }, newJointTurn), blendOut: MutableJointTurn[] = [];
  /**
   * 0 standing, 1 seated: how far she has sat (Joshua, 2026-10-28: "a smooth procedural standing to sitting that lasts
   * about 5s"). SIT from STAND, and STAND from SIT, move it over SIT_SECONDS (`sitMoving`); every other pose switch sets it.
   */
  let sitAmount = 0, sitMoving = false;
  /** How far she has sat, as her shapes and her bump's tilt take it (eased as her bones are). */
  const seatShare = () => sitEase(sitAmount);

  // ------------------------------------------------------------ the orbit
  const ORBIT_START = Object.freeze({ yaw: 0.5, pitch: 0.12, distance: 2.9 * M, target: Object.freeze(new THREE.Vector3(0, 0.95 * M, 0)) });
  /** a probe's aim (`aim`) holding the view's depth where it put it, until the view is reset */
  let aimHeld = false;
  const orbit: { yaw: number; pitch: number; distance: number; target: THREE.Vector3 } = { yaw: ORBIT_START.yaw, pitch: ORBIT_START.pitch, distance: ORBIT_START.distance, target: ORBIT_START.target.clone() };
  function placeCamera(): void {
    const c = Math.cos(orbit.pitch);
    camera.position.set(
      orbit.target.x + orbit.distance * c * Math.sin(orbit.yaw),
      orbit.target.y + orbit.distance * Math.sin(orbit.pitch),
      orbit.target.z + orbit.distance * c * Math.cos(orbit.yaw),
    );
    camera.lookAt(orbit.target);
  }

  // SHE IS FRAMED IN THE STAGE (studioLayout.ts): the rail and the inspector cover part of the screen -- the left and
  // right held landscape, the bottom held upright, where BACK and the title also take the top -- so the view slides
  // until its middle is the stage's middle, and widens until what a landscape screen shows of her, top to bottom, fits
  // the stage's height. The camera's own place and the orbit are as they were.
  let studio: StudioLayout | null = null;
  /** LIGHT or DARK, as this device last chose (studioTheme.ts). */
  let theme: StudioTheme = readTheme(localStore());
  /** Her name over the stage: the CHARACTERS panel's name. */
  let nameLine: HTMLElement | null = null;
  function frame(width: number, height: number, lay = true): void {
    camera.aspect = width / Math.max(1, height);
    if (lay) studio?.setPortrait(height > width);
    const c = studio?.covered() ?? { left: 0, right: 0, top: 0, bottom: 0 };
    const cssWidth = Math.max(1, hud?.clientWidth ?? width), cssHeight = Math.max(1, hud?.clientHeight ?? height);
    // the angles' row floats over the stage's bottom: she stands above it, not behind it
    const top = c.top + (studio?.portrait ? UPRIGHT_TOP : 0), bottom = c.bottom + (studio ? studio.stage.bottom.getBoundingClientRect().height + 12 : 0);
    const shownX = Math.max(0.2, 1 - (c.left + c.right) / cssWidth), shownY = Math.max(0.2, 1 - (top + bottom) / cssHeight);
    if (shownX < 0.999 || shownY < 0.999) {
      const middleX = c.left / cssWidth + shownX / 2, middleY = top / cssHeight + shownY / 2;
      camera.fov = 2 * THREE.MathUtils.radToDeg(Math.atan(Math.tan(THREE.MathUtils.degToRad(LANDSCAPE_FOV / 2)) / shownY));
      camera.setViewOffset(width, height, width * (0.5 - middleX), height * (0.5 - middleY), width, height);
    } else {
      camera.fov = LANDSCAPE_FOV;
      camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------------ HUD
  let hud: HTMLElement | null = null;
  let texturePanel: ReturnType<typeof garmentTexturePanel> | null = null;
  // the fabric editor (fabricPanel.ts); while it paints onto her body every garment is hidden (Joshua, 2026-10-20)
  let fabric: FabricPanel | null = null;
  /** The clothing builder (strapBuilder.ts): straps and cords pinned to her skin (Joshua, 2026-10-23). */
  let builder: StrapBuilder | null = null;
  /**
   * Her animation clock, for watching a built strap ride her (Joshua, 2026-10-23: "play, pause, slow and step Walk,
   * Sit"): paused, how fast it runs, and a step owed while paused (one frame of a 30 fps clock).
   */
  const clock = { paused: false, speed: 1, step: 0 };
  /** Which modelled garments the outfit editor lets the room draw (`fabricPanel.ts`): all, none while painting her body, or one ISOLATED. */
  let garmentView: 'all' | 'none' | string = 'all';

  // ------------------------------------------------------------ HER FACE (faceRig.ts, faceMotion.ts)
  // Joshua, 2026-10-24: "would like to somehow add bones 🦴 in or something around the mouth to open and close like
  // talking, and maybe the illusion of the eyes being able to look around in sync". Her sculpt's mouth is shut and its
  // eyes blank, and the file is approved: the face is a shader layer on her body's own material, moved each frame.
  const faceMotion = new FaceMotion(7);
  /** The material the face is laid on (only her approved v2 body's: every number in faceRig.ts is measured on it). */
  let faceMaterial: THREE.Material | null = null;
  let faceOn = true, irisIndex = 0, browPct = 100, lipPct = 55;
  const cameraRest: [number, number, number] = [0, 0, 1];
  /**
   * HER HAIR (`scripts/sarahV2Recovery/hair-bake.mjs`): one skinned mesh on her own skeleton, bound to her as every
   * recovered garment is. It is not a garment: CLOTHES · HIDDEN and the outfit editor leave it on.
   */
  let hairMeshes: THREE.SkinnedMesh[] = [];
  let hairOn = true, hairRequest = 0;
  function loadHair(): void {
    const b = bodyOf();
    if (!b || !recovered) return;
    const request = ++hairRequest;
    void assets.loadModel(SARAH_V2_HAIR_MODEL, () => new THREE.Object3D()).then((root) => {
      if (request !== hairRequest || disposed || bodyOf()?.mesh !== b.mesh || root.userData.isPlaceholder === true) { release(root); return; }
      hairMeshes = attachRecoveredMeshes(root, b.mesh, 'sarahHair');
      for (const m of hairMeshes) { m.visible = hairOn; m.castShadow = b.mesh.castShadow; m.receiveShadow = b.mesh.receiveShadow; for (const mat of Array.isArray(m.material) ? m.material : [m.material]) patchHairMaterial(mat); }
      // her hair takes her build too (its weights on her neck and head)
      const build = currentBuild();
      for (const m of hairMeshes) { const fields = liftShapeFields(m) ?? baseShapeFields(m); shaped.push({ mesh: m, fields }); applyShapeFields(m, fields, {}, { post: buildPost(m, fields, build) }); }
      refresh();
    });
  }
  /** One frame of her face: where the camera is in her head's rest frame, the animator, then the shader's uniforms. */
  function faceFrame(dt: number): void {
    const b = bodyOf();
    if (!faceMaterial || !b || b.material !== faceMaterial || !model?.visible) return;
    model.updateMatrixWorld(true);
    const cam = faceMotion.mode === 'camera' ? restFromWorld(b.mesh, camera.position, cameraRest) : null;
    faceMotion.step(dt, cam);
    setFaceRig(faceMaterial, faceOn ? { jaw: faceMotion.jaw, gazeRight: faceMotion.gazeRight, gazeLeft: faceMotion.gazeLeft, blink: faceMotion.blink, iris: IRIS_CHOICES[irisIndex].linear, brow: browPct / 100, lips: lipPct / 100 } : null);
  }

  // ------------------------------------------------------------ HER SKIN (skinChoices.ts, skinPaint.ts)
  // Joshua, 2026-10-24: "compress all the images and add a button to switch between them, and maybe a simple body
  // texture uploaded/paint". SKIN steps through the file's own map and his enhanced candidates; UPLOAD adds a picture
  // from the phone; PAINT SKIN paints on whichever she wears. Nothing of the body file changes: each is a map laid on
  // her material, the file's own kept to come back to.
  /** The skin chosen, and the one she wears (they differ while a candidate downloads, and after one fails). */
  let skinId: SkinId = readSkin();
  let skinWorn: SkinId = 'original';
  let skinUpload: { readonly name: string; readonly width: number; readonly height: number; readonly texture: THREE.Texture } | null = null;
  let skinState: 'loading' | 'ready' | 'failed' = 'ready';
  let skinRequest = 0;
  /** The candidate fetched last: one at a time is kept on the GPU, the one she wears. */
  let skinFetched: { readonly id: SkinId; readonly texture: THREE.Texture } | null = null;
  /** The brush's copy of her map, once PAINT SKIN has been switched on for this map; the map it was copied from is `under`. */
  let painted: { readonly painter: SkinPainter; readonly under: THREE.Texture | null } | null = null;
  let skinPaintOn = false, skinPainting = false;
  /** Her clothes off while her skin is painted (CLOTHES · HIDDEN), as the fabric editor's brush hides them. */
  let skinBare = false;
  const brush: { cm: number; strength: number; hard: boolean; erase: boolean; hex: string; texture: boolean; stamp: boolean; textureCm: number } = { cm: SKIN_BRUSH_CM.initial, strength: 0.5, hard: false, erase: false, hex: SKIN_SWATCHES[0].hex, texture: false, stamp: false, textureCm: SKIN_TEXTURE_CM.initial };
  /**
   * A picture to paint WITH (Joshua, 2026-10-24: "can you upload custom paint textures like with the clothing?"): TILE
   * repeats it over her every TEXTURE SIZE, as the clothing's patterns do; STAMP lays it once, TEXTURE SIZE wide, where a
   * stroke starts, and the stroke rubs it in. Its pixels are read once, at most 1024 square.
   */
  let paintTexture: { readonly name: string; readonly image: SkinImage } | null = null;
  /** The TILE pattern for the picture at the size set, made again only when either changes. */
  let tileCache: { readonly image: SkinImage; readonly units: number; readonly pattern: SkinPattern } | null = null;
  /** Mesh units a centimetre on her body (for the TILE pattern), from the painter's mesh. */
  let paintUnitsPerCm = 1;
  let paintMeta = '';
  function readSkin(): SkinId {
    const v = localStore()?.getItem(SKIN_KEY);
    return SKIN_CHOICES.some((c) => c.id === v) ? (v as SkinId) : DEFAULT_SKIN;
  }
  function bodyOf(): { readonly mesh: THREE.SkinnedMesh; readonly material: THREE.MeshStandardMaterial } | null {
    const mesh = skinned.find((m) => !!m.geometry.getAttribute('_cloth_cover'));
    const material = mesh && ((Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial);
    return mesh && material ? { mesh, material } : null;
  }
  /** The file's own map, kept the first time anything else is laid on her. */
  const ownMap = (material: THREE.MeshStandardMaterial) => (material.userData.ownMap ??= material.map) as THREE.Texture | null;
  /** A map set up as the file's own is: sRGB, glTF's flipY, its sampler, its transform. */
  function likeOwn(t: THREE.Texture, own: THREE.Texture | null): THREE.Texture {
    t.flipY = false; t.colorSpace = THREE.SRGBColorSpace;
    if (own) { t.colorSpace = own.colorSpace; t.wrapS = own.wrapS; t.wrapT = own.wrapT; t.channel = own.channel; t.anisotropy = own.anisotropy; t.offset.copy(own.offset); t.repeat.copy(own.repeat); t.rotation = own.rotation; t.center.copy(own.center); t.matrixAutoUpdate = own.matrixAutoUpdate; t.matrix.copy(own.matrix); }
    t.needsUpdate = true;
    return t;
  }
  function freeFetched(keep?: THREE.Texture): void {
    if (skinFetched && skinFetched.texture !== keep) skinFetched.texture.dispose();
    if (skinFetched?.texture !== keep) skinFetched = null;
  }
  /** The brush's copy goes; her material gets back the map it was copied from. */
  function dropPainter(): void {
    if (!painted) return;
    const b = bodyOf();
    if (b && b.material.map === painted.painter.texture) { b.material.map = painted.under; b.material.needsUpdate = true; }
    painted.painter.dispose();
    painted = null; skinPainting = false;
  }
  /** Put the chosen skin on her, fetching a candidate the first time; a fresh map is a fresh start for the brush. */
  function applySkin(): void {
    const b = bodyOf();
    if (!b) return;
    const own = ownMap(b.material), request = ++skinRequest;
    const wear = (t: THREE.Texture | null, id: SkinId) => {
      dropPainter();
      if (b.material.map !== t) { b.material.map = t; b.material.needsUpdate = true; }
      skinWorn = id; skinState = 'ready';
      if (id !== 'upload') { try { localStore()?.setItem(SKIN_KEY, id); } catch { /* a private window: the choice is not kept */ } }
      // (her doors' outsides take her skin's tone: the skin she wears now)
      applyOpening();
      refresh();
    };
    if (skinId === 'original') { wear(own, 'original'); freeFetched(); return; }
    if (skinId === 'upload') { if (skinUpload) { wear(skinUpload.texture, 'upload'); freeFetched(); } else { skinId = 'original'; wear(own, 'original'); } return; }
    if (skinFetched?.id === skinId) { wear(skinFetched.texture, skinId); return; }
    const choice = SKIN_CHOICES.find((c) => c.id === skinId);
    if (!choice?.path) { skinId = 'original'; wear(own, 'original'); return; }
    skinState = 'loading'; refresh();
    void assets.loadTexture(choice.path).then((t) => {
      if (request !== skinRequest || disposed) { t?.dispose(); return; }
      // she keeps the skin she had, and SKIN says it is still that one
      if (!t) { skinState = 'failed'; skinId = skinWorn; refresh(); return; }
      const texture = likeOwn(t, own);
      wear(texture, choice.id);
      freeFetched(texture);
      skinFetched = { id: choice.id, texture };
    });
  }
  /** A picture from the phone becomes UPLOAD, and she wears it. */
  async function uploadSkin(file: File): Promise<void> {
    let image: (CanvasImageSource & { width: number; height: number }) | null = null;
    try { image = await createImageBitmap(file); } catch {
      image = await new Promise<HTMLImageElement | null>((resolve) => { const i = new Image(), url = URL.createObjectURL(file); i.onload = () => { URL.revokeObjectURL(url); resolve(i); }; i.onerror = () => { URL.revokeObjectURL(url); resolve(null); }; i.src = url; });
    }
    if (!image || disposed) { skinState = 'failed'; refresh(); return; }
    const b = bodyOf();
    const texture = likeOwn(new THREE.Texture(image as THREE.Texture['image']), b ? ownMap(b.material) : null);
    const old = skinUpload;
    skinUpload = { name: file.name, width: image.width, height: image.height, texture };
    skinId = 'upload'; applySkin();
    if (old) old.texture.dispose();
  }
  /** The brush's copy of the map she wears, made the first time PAINT SKIN comes on for it. */
  async function ensurePainter(): Promise<SkinPainter | null> {
    if (painted) return painted.painter;
    const b = bodyOf();
    if (!b) return null;
    const under = b.material.map;
    const drawable = (im: unknown): im is CanvasImageSource & { width: number; height: number } =>
      (typeof ImageBitmap !== 'undefined' && im instanceof ImageBitmap) || (typeof HTMLImageElement !== 'undefined' && im instanceof HTMLImageElement)
      || (typeof HTMLCanvasElement !== 'undefined' && im instanceof HTMLCanvasElement) || (typeof OffscreenCanvas !== 'undefined' && im instanceof OffscreenCanvas);
    let source: (CanvasImageSource & { width: number; height: number }) | null = drawable(under?.image) ? under.image : null;
    // the KTX2 pilot's map has no pixels a canvas can read: the brush starts from the original as an image
    if (!source) { const t = await assets.loadTexture(SKIN_ORIGINAL_IMAGE); source = drawable(t?.image) ? t.image : null; t?.dispose(); }
    if (!source || disposed || bodyOf()?.mesh !== b.mesh || b.material.map !== under) return null;
    // the brush paints at 2048 at most: a 4096 map would hold 128 MB of pixels in the phone's memory to paint on
    if (source.width > PAINT_MAX_SIZE || source.height > PAINT_MAX_SIZE) {
      const s = PAINT_MAX_SIZE / Math.max(source.width, source.height), c = document.createElement('canvas');
      c.width = Math.round(source.width * s); c.height = Math.round(source.height * s);
      c.getContext('2d')?.drawImage(source, 0, 0, c.width, c.height);
      source = c;
    }
    ensureRest(b.mesh.geometry as THREE.BufferGeometry, shaped.find((x) => x.mesh === b.mesh)?.fields ?? null);
    const scale = b.mesh.getWorldScale(new THREE.Vector3()).x || 1;
    const painter = new SkinPainter(b.mesh, source, under, scale / M);
    paintUnitsPerCm = (M / 100) / scale;
    painted = { painter, under };
    b.material.map = painter.texture; b.material.needsUpdate = true;
    paintMeta = `${source.width}×${source.height}`;
    refresh();
    return painter;
  }
  /** One finger paints her skin: PAINT SKIN on, the FACE section open, and a copy of her map to paint on. */
  const paintingSkin = () => skinPaintOn && !!painted && studio?.open === 'face' && !studio.folded;
  /** A dab where the finger is (a stroke's first one also finds where every vertex of her is on screen now). */
  function skinStroke(x: number, y: number, first: boolean): void {
    const p = painted?.painter;
    if (!p) return;
    if (first) { model?.updateMatrixWorld(true); const { width, height } = ctx.renderer.size(); p.beginStroke(camera, width, height); skinPainting = true; }
    p.stroke(x, y, brushSettings());
  }
  /** The brush as FACE sets it: a colour, or the uploaded picture as a tile or a stamp. */
  function brushSettings(): SkinStrokeSettings {
    const base: SkinStrokeSettings = { colour: hexRgb(brush.hex), radiusCm: brush.cm, strength: brush.strength, hardness: brush.hard ? 0.85 : 0.2, erase: brush.erase };
    if (!brush.texture || !paintTexture || brush.erase) return base;
    if (brush.stamp) return { ...base, stamp: { image: paintTexture.image, widthCm: brush.textureCm } };
    const units = brush.textureCm * paintUnitsPerCm;
    if (!tileCache || tileCache.image !== paintTexture.image || tileCache.units !== units) tileCache = { image: paintTexture.image, units, pattern: tilePattern(paintTexture.image, units) };
    return { ...base, pattern: tileCache.pattern };
  }
  /** A picture from the phone to paint with: TEXTURE comes on with it. */
  async function uploadPaintTexture(file: File): Promise<void> {
    let image: (CanvasImageSource & { width: number; height: number }) | null = null;
    try { image = await createImageBitmap(file); } catch {
      image = await new Promise<HTMLImageElement | null>((resolve) => { const i = new Image(), url = URL.createObjectURL(file); i.onload = () => { URL.revokeObjectURL(url); resolve(i); }; i.onerror = () => { URL.revokeObjectURL(url); resolve(null); }; i.src = url; });
    }
    if (!image || disposed) return;
    paintTexture = { name: file.name, image: SkinPainter.imageOf(image, 1024) };
    if ('close' in image && typeof image.close === 'function') image.close();
    tileCache = null; brush.texture = true; brush.erase = false;
    refresh();
  }
  function endSkinStroke(): void {
    if (!skinPainting) return;
    painted?.painter.endStroke(); skinPainting = false; refresh();
  }
  /**
   * THE BELLY CURVE (`bellyInterpolation.ts`): HYBRID by default (Joshua, 2026-10-22: "change the default as hybrid,
   * but make the current as a backup"); CURRENT, the approved slider, stays one tap away. For this session only.
   */
  let bellyCurve: BellyCurve = DEFAULT_BELLY_CURVE;
  /** The belly sizes her sides smoothing was baked at, once her correction file is on (zeroRefine.ts). */
  let sidesAt: number[] = [];
  /** The belly sizes her baby-weight shapes were baked at, once their file is in (zeroRefine.ts). */
  let babyAt: number[] = [];
  /** The belly sizes her cleavage smoothing and her milk shapes were baked at, once their files are in (zeroRefine.ts). */
  let chestAt: number[] = [], milkAt: number[] = [], groinAt: number[] = [];
  const fields: Record<string, HTMLElement> = {};
  const buttons: Record<string, HTMLButtonElement> = {};
  /** the BIRTH row's buttons (dimmed, with the rest of a pregnancy's, while she is not pregnant) */
  let birthButtons: HTMLButtonElement[] = [];
  /** HER WEEKS' boxes (pregnancy.ts), by `SARAH_LAB_FIELD`, and the week box's own label */
  const weekBoxes = new Map<string, HTMLInputElement>();
  let weekLabel: HTMLElement | null = null;
  /** FACE's own controls: the held-open mouth, and the eye-colour swatches. */
  let faceMouthInput: HTMLInputElement | null = null;
  const irisButtons: HTMLButtonElement[] = [];
  /** FACE's brush controls (shown while PAINT SKIN is on) and its colour swatches, by colour. */
  let skinTools: HTMLElement | null = null;
  /** The TEXTURE SIZE slider and its line, shown only with a picture to paint with. */
  let textureSize: HTMLInputElement | null = null, textureLabel: HTMLElement | null = null;
  const swatchButtons = new Map<string, HTMLButtonElement>();
  let armsInput: HTMLInputElement | null = null;
  let slopeInput: HTMLInputElement | null = null;
  let shirtLengthInput: HTMLInputElement | null = null;
  /**
   * THE CLOTH EXPERIMENT (Joshua, 2026-10-23: "make that one a true soft body/cloth with simulation over the whole
   * thing... I want to be able to see how much or little having a full soft body cloth fabric would be"): the light tee
   * as one simulated sheet (clothShirt.ts), on while CLOTH SIM is, its length from the tee as made to mid-thigh, and what
   * it costs each frame on the stage. Fetched the first time it is turned on.
   */
  // the FITTED light tee's detail (BREAST and NAVEL DETAIL on the modelled tee, the cloth off): a few points of her and
  // of the tee posed on the CPU each frame -- her navel and nipples, and the tee's own navel against its smooth surface
  /** Her navel as its own piece on her approved body (navelPiece.ts, zeroRefine.ts); null on any other body. */
  let navel: { mesh: THREE.SkinnedMesh; piece: NavelPiece } | null = null;
  let fitted: { body: THREE.SkinnedMesh; tee: THREE.SkinnedMesh; bodyPose: SkinPose; teePose: SkinPose; spots: DetailSpots; navel: TeeNavel; surface: NavelSurface } | null = null;
  let fittedLaid = false;
  /**
   * CLOTH SIM ON BY DEFAULT (Joshua, 2026-10-24: "we need to make sure the cloth sim is on by default, you have it
   * off"): she wears the light tee as cloth whenever she has it on, unless CLOTH SIM has been switched off.
   */
  let clothWanted = true;
  /**
   * SEATED, THE CLOTH TEE GIVES WAY TO THE FITTED ONE (Joshua, 2026-10-25: "when the default Sarah sits, her shirt is
   * showing holes and looks teared"). Sitting, her arms come forward and her shoulders roll, and the skin under each arm
   * opens: the sleeve's hem, held to her arm, and the side panel beside it, lying on her trunk, part by up to 7 cm where the
   * cloth between them is a few millimetres long, and the simulated tee tore at both sleeves. The fitted light tee is the
   * same garment in the same fabric, skinned to her as her body is, so it cannot tear: from the moment she sits until she
   * has stood up again it is what she wears, and the cloth is laid on her afresh when she is standing.
   */
  let clothSeated = false;
  /** Whether seated she wears the fitted tee instead of the cloth (a probe can turn this off to watch the cloth seated). */
  let seatedStandIn = true;
  /** Stage 2b's procedural tee, put on her by a probe (`?probe=cloth` garment()) for review; never by the room itself. */
  let garmentRoom: RoomGarment | null = null, garmentPoseKey = '', garmentShapeKey = '', garmentRefit = false, garmentRefitAge = Infinity;
  /**
   * The procedural tee an OUTFIT put on her (`OUTFITS[i].procedural`), its construction; null when none did. Once a
   * probe has put a garment on her (`?probe=cloth` garment()), the probe owns it and the outfit leaves it alone.
   */
  let garmentAuto: 'raglan' | 'setIn' | null = null, garmentProbed = false, garmentDressT = 0, garmentTailoring = false;
  /** A probe's look at the garment's shape alone: false draws her details through it as nothing (the shading off). */
  let garmentShade = true;
  /** A probe's switch: the new tee's cut edges drawn by its material (true, as always), or its kept triangles whole. */
  let teeCutDrawn = true;
  /** A probe's note of the skin the tee covered when it looked (`teePokes`). */
  let teeCovered: number[] = [];
  /**
   * The new tee's own sheet as it is drawn now, for a probe (world; NaN for a point it does not draw), with its triangles
   * (the drawn ones only).
   */
  function teeSheetNow(): { position: Float32Array; normal: Float32Array; index: number[] } | null {
    if (!garmentRoom) return null;
    const m = garmentRoom.cloth.mesh, g = m.geometry, P = g.getAttribute('position'), N = g.getAttribute('normal'), idx = g.getIndex();
    m.updateMatrixWorld(true);
    const nm = new THREE.Matrix3().getNormalMatrix(m.matrixWorld), position = new Float32Array(P.count * 3).fill(NaN), normal = new Float32Array(P.count * 3), p = new THREE.Vector3();
    const start = g.drawRange.start, end = Math.min(idx ? idx.count : P.count, start + g.drawRange.count), index: number[] = [];
    for (let e = start; e < end; e++) {
      const i = idx ? idx.getX(e) : e;
      index.push(i);
      if (Number.isFinite(position[i * 3])) continue;
      p.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld).toArray(position, i * 3);
      p.fromBufferAttribute(N, i).applyMatrix3(nm).normalize().toArray(normal, i * 3);
    }
    return { position, normal, index };
  }
  /** What `teeAlone` hid, to put back. */
  let teeAloneWas: (() => void)[] = [];
  /** `teeSeams`'s note of each of the tee's edges' length when it was marked (welded point pairs, "a,b" to length). */
  let teeEdgesAt: Map<string, number> | null = null;
  /**
   * THE NEW TEE'S SETTINGS (Stage 3, `garment/settings.ts`): what its panel shows, what it is cut and tailored from, and
   * what a save of the outfit keeps. An outfit puts on its save's or its own (`adoptGarment`); the panel changes them.
   * `garmentCommitted` is the pattern they ask for once a finger has let go (`tailorKey`): a re-tailor setting dragged
   * cuts the tee it is on as it goes, and the tee is tailored again only when it is let go.
   */
  let garmentSettings: GarmentSettings = GARMENT_DEFAULTS, garmentCommitted = tailorKey(GARMENT_DEFAULTS);
  let garmentPanel: GarmentPanel | null = null;
  const clothWorn = (): boolean => clothOn && !!cloth && !clothSeated;
  let cloth: ClothShirt | null = null, clothOn = false, clothLoading = false, clothRestart = false, clothRefit = false, teeLength = CLOTH_TEE_LENGTH_DEFAULT, frameMs = 1000 / 60;
  let teeLengthInput: HTMLInputElement | null = null;
  /** SLEEVES (Joshua, 2026-10-25): the cloth tee's cap sleeves as made, or a tank's armholes. */
  let sleeves = true;
  /** TEE LENGTH (a crop top at 0, the tee as made, mid-thigh at 1) put to the cloth: the crop and the rows below the hem. */
  const applyTeeLength = (): void => { const { crop, length } = teeLengthParts(teeLength); cloth?.setLength(length); cloth?.setCrop(crop); };
  /** NECKLINE (-100 a turtleneck, 0 as made, 100 the front cut to under her bust) and the deeper cut's shape (Joshua, 2026-10-24). */
  let neckline = CLOTH_NECKLINE_DEFAULT, neckShape: 'U' | 'V' = 'U';
  let necklineInput: HTMLInputElement | null = null;
  /** The cloth's dials (CLOTH_DIALS), kept across a reload of the cloth, and their sliders. */
  let clothTune: ClothTune = CLOTH_TUNE_DEFAULT;
  /** Her shape the cloth was last cut for. */
  let clothShapeKey = '';
  const clothDialInputs = new Map<string, HTMLInputElement>();
  /** Put the dials on the cloth, live (the cloth tee's and the new tee's). */
  function tuneCloth(): void {
    tuneGarment();
    if (!cloth) return;
    const { settings, standOff } = clothTuning(clothTune);
    Object.assign(cloth.simSettings, settings);
    cloth.standOff = standOff;
  }
  /**
   * The dials on the new tee, live: as on the cloth tee, but its FIT scales the tee's own drafted size (REST_SCALE at the
   * default) and its stiffer bend is kept (`garmentCloth.ts` BEND_COMPLIANCE).
   */
  function tuneGarment(): void {
    if (!garmentRoom) return;
    const { settings, standOff } = clothTuning(clothTune);
    Object.assign(garmentRoom.cloth.simSettings, { ...settings, restScale: REST_SCALE * garmentFitScale(), bendCompliance: BEND_COMPLIANCE });
    garmentRoom.cloth.standOff = standOff;
  }
  /** The FIT dial against its default, for the new tee (`RoomGarment.fitScale`). */
  const garmentFitScale = (): number => clothRestScale(clothTune.fit) / clothRestScale(CLOTH_TUNE_DEFAULT.fit);
  const pointers = new Map<number, { x: number; y: number }>();
  let pinch = 0;
  /** One finger builds (places and moves a built strap's points) while the builder's EDIT is on and nothing is painting. */
  const building = () => !fabric?.tool() && !!builder?.editing();

  // UNDO / REDO FOR HER BODY (from the Character Studio preview): every settled change to her size and shape -- a
  // slider let go, RANDOMIZE, a reset, a quick size, a saved body put on -- is a step. A drag is one step: the change is
  // recorded once it has been still for BODY_SETTLE_MS.
  interface BodyStep { readonly bump: number; readonly body: BodyShape }
  const stepKey = (s: BodyStep) => `${s.bump}|${serializeShape(s.body)}`;
  let bodyHistory: History<BodyStep> | null = null, bodyKey = '', bodyTimer: ReturnType<typeof setTimeout> | null = null;
  function noteBody(): void {
    const now: BodyStep = { bump, body }, key = stepKey(now);
    if (!bodyHistory) { bodyHistory = new History(now, 60); bodyKey = key; return; }
    if (key === bodyKey) return;
    bodyKey = key;
    if (bodyTimer) clearTimeout(bodyTimer);
    bodyTimer = setTimeout(() => { bodyTimer = null; settleBody(); refresh(); }, BODY_SETTLE_MS);
  }
  function settleBody(): void {
    if (bodyTimer) { clearTimeout(bodyTimer); bodyTimer = null; }
    if (bodyHistory && stepKey(bodyHistory.current) !== stepKey({ bump, body })) bodyHistory.push({ bump, body });
  }
  function travelBody(direction: -1 | 1): void {
    if (!bodyHistory) return;
    settleBody();
    const to = direction < 0 ? bodyHistory.undo() : bodyHistory.redo();
    if (!to) return;
    bump = to.bump; body = to.body; bodyKey = stepKey(to);
    applyLook(); applyMotion();
  }

  /** FACE's lines and buttons: which skin, its state, and the brush (an action with nothing to act on looks it). */
  function refreshSkin(): void {
    const noFace = !faceMaterial;
    if (buttons.face) { buttons.face.textContent = noFace ? 'FACE · v2 body only' : `FACE · ${faceOn ? 'ON' : 'OFF (the sculpt)'}`; buttons.face.disabled = noFace; buttons.face.style.opacity = noFace ? '.4' : '1'; }
    if (buttons.hair) { const none = hairMeshes.length === 0; buttons.hair.textContent = none ? (faceMaterial ? 'HAIR · loading…' : 'HAIR · v2 body only') : `HAIR · ${hairOn ? 'ON' : 'OFF'}`; buttons.hair.disabled = none; buttons.hair.style.opacity = none ? '.4' : '1'; }
    if (buttons.eyes) buttons.eyes.textContent = eyesLine(faceMotion.mode);
    if (buttons.blink) buttons.blink.textContent = `BLINK · ${faceMotion.blinking ? 'ON' : 'OFF'}`;
    if (buttons.talk) buttons.talk.textContent = `TALK · ${faceMotion.talking ? 'ON' : 'OFF'}`;
    const mouthField = fields[SARAH_LAB_FIELD.faceMouth];
    if (mouthField) mouthField.textContent = mouthLine(faceMotion.mouth * 100, faceMotion.talking);
    if (faceMouthInput && Number(faceMouthInput.value) !== Math.round(faceMotion.mouth * 100)) faceMouthInput.value = String(Math.round(faceMotion.mouth * 100));
    const browField = fields[SARAH_LAB_FIELD.faceBrows], lipField = fields[SARAH_LAB_FIELD.faceLips];
    if (browField) browField.textContent = browsLine(browPct);
    if (lipField) lipField.textContent = lipsLine(lipPct);
    irisButtons.forEach((b, i) => { b.style.borderColor = i === irisIndex ? 'var(--sl-accent,#d4a853)' : 'var(--sl-btn-line,#ffffff30)'; });
    if (buttons.skin) buttons.skin.textContent = skinLine(skinId, skinUpload);
    const note = fields[SARAH_LAB_FIELD.skinNote];
    if (note) note.textContent = skinNote(skinId, skinUpload, skinState, !!painted?.painter.canUndo) + (painted ? ` · brush on a ${paintMeta} copy` : '');
    if (buttons.skinPaint) buttons.skinPaint.textContent = `PAINT SKIN · ${skinPaintOn ? (painted ? 'ON' : 'preparing…') : 'OFF'}`;
    if (buttons.skinBare) buttons.skinBare.textContent = `CLOTHES · ${skinBare ? 'HIDDEN' : 'SHOWN'}`;
    if (skinTools) skinTools.style.display = skinPaintOn ? 'flex' : 'none';
    for (const [hex, b] of swatchButtons) b.style.borderColor = !brush.erase && hex === brush.hex ? 'var(--sl-accent,#d4a853)' : 'var(--sl-btn-line,#ffffff30)';
    const sizeLine = fields[SARAH_LAB_FIELD.skinBrush], strengthLine = fields[SARAH_LAB_FIELD.skinStrength];
    if (sizeLine) sizeLine.textContent = skinBrushLine(brush.cm, brush.hard, brush.erase);
    if (strengthLine) strengthLine.textContent = skinStrengthLine(brush.strength);
    if (buttons.skinHard) buttons.skinHard.textContent = `EDGE · ${brush.hard ? 'HARD' : 'SOFT'}`;
    if (buttons.skinErase) buttons.skinErase.textContent = `ERASE · ${brush.erase ? 'ON' : 'OFF'}`;
    const withTexture = !!paintTexture && brush.texture && !brush.erase;
    if (buttons.skinTexture) { buttons.skinTexture.textContent = `PAINT WITH · ${withTexture ? 'TEXTURE' : 'COLOUR'}`; buttons.skinTexture.disabled = !paintTexture; buttons.skinTexture.style.opacity = paintTexture ? '1' : '.4'; }
    if (buttons.skinStamp) { buttons.skinStamp.textContent = `TEXTURE · ${brush.stamp ? 'STAMP' : 'TILE'}`; buttons.skinStamp.style.display = paintTexture ? '' : 'none'; }
    if (textureSize) textureSize.style.display = paintTexture ? '' : 'none';
    if (textureLabel) { textureLabel.style.display = paintTexture ? '' : 'none'; textureLabel.textContent = skinTextureLine(brush.textureCm, brush.stamp, paintTexture?.name ?? '', withTexture); }
    for (const [, b] of swatchButtons) if (withTexture) b.style.borderColor = 'var(--sl-btn-line,#ffffff30)';
    const p = painted?.painter;
    for (const [b, on] of [[buttons.skinUndo, !!p?.canUndo], [buttons.skinRedo, !!p?.canRedo], [buttons.skinClear, !!p], [buttons.skinSave, !!p]] as const) {
      if (!b) continue;
      b.disabled = !on; b.style.opacity = on ? '1' : '.4';
    }
  }
  /** HER PREGNANCY changed (PREGNANT, or a week typed): her babies fitted again for the week her belly stands for */
  function setPregnancy(next: Pregnancy): void { pregnancy = next; babyDirty = true; babyFitAt = -Infinity; applyLook(); applyMotion(); refresh(); }
  /** HER WEEKS' boxes: what is typed, or blank with what is in force in grey; and the line under them */
  function refreshWeeks(): void {
    const chart = herChart(babyCount, pregnancy), here = herWeek(bump, babyCount, pregnancy), mine = weekIsFor(pregnancy, bump);
    const put = (field: string, typed: number | null, inForce: string, on = true) => {
      const i = weekBoxes.get(field);
      if (!i) return;
      if (document.activeElement !== i) i.value = typed === null ? '' : String(typed);
      i.placeholder = inForce; i.disabled = !on; i.style.opacity = on ? '1' : '.4';
    };
    if (weekLabel) weekLabel.textContent = `WEEK AT ${Math.round(bump)}%`;
    put(SARAH_LAB_FIELD.pregnancyWeek, mine ? pregnancy.week : null, pregnant() ? weekText(here) : '–', pregnant());
    for (const [k, on] of [['week', pregnant() && pregnancy.week !== null], ['first', pregnancy.firstWeekBump !== null], ['delivery', pregnancy.deliveryBump !== null], ['deliveryWeek', pregnancy.deliveryWeek !== null]] as const) {
      const b = buttons[`${SARAH_LAB_ACTION.pregnancyClear}${k}`];
      if (b) { b.disabled = !on; b.style.opacity = on ? '1' : '.4'; }
    }
    put(SARAH_LAB_FIELD.pregnancyFirst, pregnancy.firstWeekBump, String(Math.round(chart.firstWeekBump)));
    put(SARAH_LAB_FIELD.pregnancyDelivery, pregnancy.deliveryBump, String(Math.round(chart.deliveryBump)));
    put(SARAH_LAB_FIELD.pregnancyDeliveryWeek, pregnancy.deliveryWeek, weekText(chart.deliveryWeek));
    const line = fields[SARAH_LAB_FIELD.pregnancyLine];
    if (!line) return;
    if (!pregnant()) { line.textContent = 'not pregnant · her weeks are kept for when she is (PREGNANT · ON)'; return; }
    const from = mine ? 'as typed' : nothingTyped(pregnancy) ? `the chart's for ${BABIES_NAME[babyCount] === 'ONE' ? 'one baby' : BABIES_NAME[babyCount].toLowerCase()}` : 'off her chart';
    const pinned = pregnancy.week !== null && !mine && pregnancy.weekAtBump !== null ? ` · ${weekText(pregnancy.week)} wk typed for ${Math.round(pregnancy.weekAtBump)}%` : '';
    const unused = chart.unused.map((u) => u === 'week' ? ' · the typed week is not used: it must be past week 12 and its belly % between her week 1 and delivery' : ' · her delivery % is not used: it must be above her week 1').join('');
    line.textContent = `her week now ${weekText(here)} (${from})${pinned}${unused}`;
  }
  function refresh(): void {
    if (fields.status) fields.status.textContent = statusLine(loaded && model?.visible === true, failed, garments, hasBelly, modelIndex) + (hooks.skin === 'ktx2' ? ' · KTX2 skin' : '') + (wantedOutfit !== null ? ' · loading outfit…' : '');
    refreshSkin();
    const bumpField = fields[SARAH_LAB_FIELD.bump], fingerField = fields[SARAH_LAB_FIELD.fingers];
    if (bumpField) bumpField.textContent = bumpLine(bump);
    if (fingerField) fingerField.textContent = fingersLine(curl);
    { const f2 = fields[SARAH_LAB_FIELD.birthOpen];
      // (the probes set the opening too: the slider follows whatever she is)
      if (vulva) birthOpenPct = Math.round(vulva.open * 100);
      if (f2) f2.textContent = birthOpenLine(birthOpenPct, vulva?.heldTo ?? null);
      if (birthOpenInput && Number(birthOpenInput.value) !== birthOpenPct) birthOpenInput.value = String(birthOpenPct); }
    { const f4 = fields[SARAH_LAB_FIELD.foldBack];
      // (only her skeleton has the doors yet: on another body it is not shown)
      if (f4) { f4.textContent = foldBackLine(foldBackPct, organs ? organs.doorAngles : null); f4.style.display = organs?.doorsShown ? '' : 'none'; }
      if (foldBackInput) foldBackInput.style.display = organs?.doorsShown ? '' : 'none'; }
    // her belly's organs, and what her gut holds: shown with them (on her skeleton; in v2 once X-RAY has been raised)
    { const on = !!abdomen, all = gut.stomachFoodMl + gut.stomachWaterMl, needs = gutNeeds(gut), pc = (x: number) => `${Math.round(x * 100)}%`;
      const lines: [string, HTMLInputElement | null, string][] = [
        [SARAH_LAB_FIELD.stomach, stomachInput, `STOMACH ${Math.round(all)} mL · hunger ${pc(needs.hunger)}`],
        [SARAH_LAB_FIELD.bowel, bowelInput, `BOWEL (rectum) ${Math.round(gut.rectumMl)} mL · bathroom #2 ${pc(needs.bowel)}`],
        [SARAH_LAB_FIELD.bladder, bladderInput, `BLADDER ${Math.round(gut.bladderMl)} mL · bathroom #1 ${pc(needs.bladder)}`],
        [SARAH_LAB_FIELD.gutLine, null, `kidneys ${Math.round(urineMlH(gut.waterMl))} mL/h · bladder urge in ${(() => { const h = hoursToBladderUrge(gut); return h === 0 ? 'now' : Number.isFinite(h) ? `${h.toFixed(1)} h` : 'never'; })()} · thirst ${pc(needs.thirst)}`],
      ];
      for (const [f, input, text] of lines) { const el = fields[f]; if (el) { el.textContent = text; el.style.display = on ? '' : 'none'; } if (input) input.style.display = on ? '' : 'none'; } }
    { const f5 = fields[SARAH_LAB_FIELD.xray];
      // (her skeleton's: on another body it is not shown)
      const xr = organs || skeletonV2 || skeletonV2Lay;
      if (f5) { f5.textContent = xrayLine(xrayPct); f5.style.display = xr ? '' : 'none'; }
      if (xrayInput) xrayInput.style.display = xr ? '' : 'none'; }
    { const f3 = fields[SARAH_LAB_FIELD.birthBulge];
      if (vulva) birthBulgePct = Math.round(vulva.bulge * 100);
      if (f3) f3.textContent = birthBulgeLine(birthBulgePct, VULVA_OPEN.bulge * 100);
      if (birthBulgeInput && Number(birthBulgeInput.value) !== birthBulgePct) birthBulgeInput.value = String(birthBulgePct); }
    if (bumpInput && Number(bumpInput.value) !== bump) bumpInput.value = String(bump);
    refreshWeeks();
    for (const spec of BODY_RANDOM_SPECS) {
      const b = lockButtons.get(spec.key);
      if (!b) continue;
      const own = ruleFor(randomRules, spec).locked, held = isLocked(randomRules, spec);
      b.textContent = held ? '🔒' : '🔓';
      b.style.opacity = held && !own ? '.55' : '1';
      b.title = own ? 'locked: RANDOMIZE keeps this value (tap to unlock)' : held ? 'held by its group lock' : 'lock: RANDOMIZE keeps this value';
    }
    for (const [group, label] of RANDOM_GROUPS) {
      const b = buttons[`groupLock-${group}`];
      if (b) b.textContent = `${label} ${randomRules.groups.includes(group) ? '🔒' : '🔓'}`;
    }
    // her proportions are measured on her approved v2 body: on another, the section and its lock are not shown at all
    if (buildBox) buildBox.style.display = buildRig ? '' : 'none';
    if (buttons['groupLock-build']) buttons['groupLock-build'].style.display = buildRig ? '' : 'none';
    for (const r of rangeRows) {
      r.row.style.display = rangesShown ? 'flex' : 'none';
      const rule = ruleFor(randomRules, r.spec);
      if (document.activeElement !== r.lo) r.lo.value = String(rule.min);
      if (document.activeElement !== r.hi) r.hi.value = String(rule.max);
    }
    const lengthField = fields[SARAH_LAB_FIELD.shirtLength], length = fabric?.shirtLength() ?? DEFAULT_SHIRT_LENGTH;
    // it moves a painted shirt and nothing else: with none on, it says so and cannot be moved
    const shirtOn = fabric?.wearsShirt() ?? false;
    if (lengthField) lengthField.textContent = shirtLengthLine(length, PAINTED_SHIRT_LONGEST) + (shirtOn ? '' : ' · painted shirts only');
    if (shirtLengthInput) shirtLengthInput.disabled = !shirtOn;
    if (shirtLengthInput && Number(shirtLengthInput.value) !== Math.round(length * 100)) shirtLengthInput.value = String(Math.round(length * 100));
    const armsField = fields[SARAH_LAB_FIELD.arms];
    if (armsField) armsField.textContent = armsLine(armsDeg, ARM_SIDES[armSide]);
    const slopeField = fields[SARAH_LAB_FIELD.slope];
    if (slopeField) slopeField.textContent = slopeLine(slope);
    if (slopeInput && Number(slopeInput.value) !== slope.deg) slopeInput.value = String(slope.deg);
    for (const h of SLOPE.headings) buttons[SARAH_LAB_ACTION.slope + h]?.setAttribute('aria-pressed', String(slope.heading === h));
    buttons[SARAH_LAB_ACTION.balance]?.setAttribute('aria-pressed', String(balanceOn));
    const balanceField = fields[SARAH_LAB_FIELD.balance];
    if (balanceField) balanceField.textContent = balanceLine();
    if (armsInput && Number(armsInput.value) !== armsDeg) armsInput.value = String(armsDeg);
    if (buttons.armSide) buttons.armSide.textContent = `ARMS · ${ARM_SIDES[armSide]}`;
    for (const c of BODY_CONTROLS) {
      const line = fields[`${SARAH_LAB_FIELD.body}${c.key}`];
      // seated, the tilt in use is not the one chosen: say both, so a sitting body never reads as the slider's
      if (line) line.textContent = controlLine(c.key, body[c.key]) + (c.key === 'bellyTilt' && pose === 'sit' ? ` · seated ${effectiveTiltDeg(body.bellyTilt, 1).toFixed(1)}°` : '') + (c.key === 'breastSize' ? ` · bust ${bustVolume(bump, body.breastSize).toFixed(2)}×` : '') + (c.key === 'navel' ? ` · ${navelLine()}` : '') + (c.key === 'navelAfter' ? ` · ${['goes back in', 'stays out a while', 'stays out at half'][Math.round(body.navelAfter)] ?? ''}` : '') + (c.key === 'babyWeight' ? ` · ${babyWeightState(body.babyWeight, babyAt.length > 0, bellyCurve)}` : '') + (c.key === 'milk' ? ` · ${milkState(body.milk, body.milkBalance, milkAt.length > 0, bellyCurve)}` : '') + (c.key === 'milkBalance' ? ` · ${milkBalanceState(body.milkBalance)}` : '') + buildNote(c.key) + walkNote(c.key);
      const input = bodyInputs.get(c.key);
      if (input && Number(input.value) !== body[c.key]) input.value = String(body[c.key]);
    }
    if (fields[SARAH_LAB_FIELD.bodyNote]) fields[SARAH_LAB_FIELD.bodyNote].textContent = loaded && !shaped.length ? 'this model has no shape fields: TILT and SIZE work, the rest are in v2-body' : '';
    const lit = (b: HTMLButtonElement | undefined, on: boolean) => {
      if (!b) return;
      b.setAttribute('aria-pressed', String(on));
      b.style.background = on ? 'var(--sl-on,#806020)' : 'var(--sl-btn,#151b23)';
      b.style.borderColor = on ? 'var(--sl-accent,#d4a853)' : 'var(--sl-btn-line,#ffffff30)';
    };
    {
      // the cloth experiment's controls: only with the light tee on (the cloth is a copy of it)
      const lite = recovered && shownNow('shirtSpandexLite') && !OUTFITS[outfit]?.procedural;
      if (buttons.cloth) { buttons.cloth.style.display = lite ? '' : 'none'; buttons.cloth.textContent = clothLoading ? 'CLOTH SIM · loading…' : `CLOTH SIM · ${clothOn ? 'ON' : 'OFF'}`; lit(buttons.cloth, clothOn); }
      const teeField = fields[SARAH_LAB_FIELD.teeLength];
      if (teeField) { teeField.textContent = teeLengthLine(teeLength, clothOn); teeField.style.display = lite ? '' : 'none'; }
      if (teeLengthInput) { teeLengthInput.style.display = lite ? '' : 'none'; teeLengthInput.disabled = !clothOn; }
      const neckField = fields[SARAH_LAB_FIELD.neckline];
      if (neckField) { neckField.textContent = necklineLine(neckline, neckShape, (cloth?.necklineDeepest ?? 0) * 100, clothOn); neckField.style.display = lite ? '' : 'none'; }
      if (necklineInput) { necklineInput.style.display = lite ? '' : 'none'; necklineInput.disabled = !clothOn; }
      if (buttons.neckShape) { buttons.neckShape.style.display = lite ? '' : 'none'; buttons.neckShape.textContent = neckShapeLine(neckShape, neckline); lit(buttons.neckShape, neckShape === 'V'); }
      if (buttons.sleeves) { buttons.sleeves.style.display = lite ? '' : 'none'; buttons.sleeves.textContent = sleevesLine(sleeves, clothOn); lit(buttons.sleeves, !sleeves); buttons.sleeves.disabled = !clothOn; }
      if (fields.cloth) { fields.cloth.style.display = clothOn && cloth ? '' : 'none'; if (clothOn && cloth && clothSeated) fields.cloth.textContent = CLOTH_SEATED_LINE; }
      // the new tee's controls, and the cloth's dials on it too (Stage 3: "The cloth dials show for the new tee too")
      const newTee = recovered && !!OUTFITS[outfit]?.procedural && !!garmentRoom && !!garmentAuto, dials = (lite && clothOn) || newTee;
      if (garmentPanel) { garmentPanel.element.style.display = recovered && OUTFITS[outfit]?.procedural ? '' : 'none'; garmentPanel.refresh(); }
      for (const d of CLOTH_DIALS) {
        const f = fields[`${SARAH_LAB_FIELD.clothDial}${d.key}`], i = clothDialInputs.get(d.key);
        if (f) { f.textContent = d.line(clothTune[d.key]); f.style.display = dials ? '' : 'none'; }
        if (i) i.style.display = dials ? '' : 'none';
      }
      if (buttons.clothReset?.parentElement) buttons.clothReset.parentElement.style.display = dials ? 'flex' : 'none';
    }
    for (const k of BREAST_DIMENSIONS) lit(buttons[`link-${k}`], linked.has(k));
    if (buttons.linkAll) { const all = BREAST_DIMENSIONS.every((k) => linked.has(k)); buttons.linkAll.textContent = all ? 'UNLINK W·H·D' : 'LINK W·H·D'; lit(buttons.linkAll, all); }
    lit(buttons.stand, pose === 'stand');
    lit(buttons.walk, pose === 'walk');
    lit(buttons.sit, pose === 'sit');
    lit(buttons.tpose, pose === 'tpose');
    for (const p of ['apart', 'squat', 'recline'] as const) lit(buttons[p], pose === p);
    lit(buttons.ranges, rangesShown);
    for (const [group] of RANDOM_GROUPS) lit(buttons[`groupLock-${group}`], randomRules.groups.includes(group));
    { const p = profileOf(body); for (const pr of BUILD_PROFILES) lit(buttons[`profile-${pr.id}`], p === pr.id); }
    for (const t of SIZE_TILT_PRESETS_DEG) lit(buttons[`tilt${t}`], body.bellyTilt === t);
    if (buttons.outfit) buttons.outfit.textContent = `OUTFIT · ${outfitName(wantedOutfit ?? outfit)}${wantedOutfit !== null ? ' …' : ''}`;
    if (buttons.model) buttons.model.textContent = modelLine(modelIndex);
    if (buttons.pregnant) { buttons.pregnant.textContent = pregnantLine(pregnancy); lit(buttons.pregnant, pregnant()); }
    if (buttons.opening) { buttons.opening.textContent = openingLine(skeletonOpening); buttons.opening.style.display = v2OrganBones ? '' : 'none'; lit(buttons.opening, skeletonOpening); }
    if (buttons.baby) { buttons.baby.textContent = !pregnant() ? 'SEE BABY · not pregnant' : babyShown ? (babyCount > 1 ? 'HIDE BABIES' : 'HIDE BABY') : (babyCount > 1 ? 'SEE BABIES' : 'SEE BABY'); lit(buttons.baby, babyShown); }
    // (an unavailable action never looks like one that works: a baby's controls dimmed while she is not pregnant)
    for (const b of [buttons.baby, buttons.babies, buttons.babyLie, buttons.babyKick, ...birthButtons]) if (b) { b.disabled = !pregnant(); b.style.opacity = pregnant() ? '1' : '.4'; }
    if (buttons.babies) buttons.babies.textContent = `BABIES · ${BABIES_NAME[babyCount]}`;
    if (buttons.babyLie) buttons.babyLie.textContent = `LIE · ${babyLie === 'auto' ? 'AUTO' : babyLie === 'random' ? 'RANDOM' : LIE_NAME[babyLie].toUpperCase()}`;
    if (babyNote) { babyNote.textContent = babyShown ? `${babyCount > 1 ? 'BABIES' : 'BABY'} · ${babyLoading ? 'loading…' : babyRoot ? `${babyLine(onChart(), body.babyWeight, babyCount)}${babyCurled < 0.995 ? ` · drawn ${Math.round((1 - babyCurled) * 100)}% smaller to fit` : ''}${babyAutoDepth >= 0.5 ? ` · depth +${Math.round(babyAutoDepth)}% to fit` : ''}${babyBalanceDeg >= 0.05 ? ` · sags ${babyBalanceDeg.toFixed(1)}°` : ''} · ${babyRoots().map((r, i) => `${babyCount > 1 ? `${'ABC'[i]} ` : ''}${LIE_NAME[(r.userData.lie as Lie | undefined) ?? 'head']}`).join(', ')}` : 'not loaded'}` : ''; babyNote.style.display = babyShown ? '' : 'none'; }
    if (buttons.refine) {
      // only v2 has the switchable curve: the button is not shown for v1
      buttons.refine.style.display = SARAH_LAB_MODELS[modelIndex].id.startsWith('v2') ? '' : 'none';
      buttons.refine.textContent = refineLine(refine);
      lit(buttons.refine, refine);
    }
    noteBody();
    for (const v of QUICK_SIZES) lit(buttons[`size${v}`], bump === v);
    for (const [b, can] of [[buttons.undoBody, !!bodyHistory?.canUndo || bodyTimer !== null], [buttons.redoBody, !!bodyHistory?.canRedo && bodyTimer === null]] as const) if (b) b.disabled = !can;
    const yaw = ((orbit.yaw % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    for (const a of VIEW_ANGLES) { const b = buttons[`view-${a.id}`]; if (b) b.setAttribute('aria-pressed', String(!turning && Math.abs(Math.atan2(Math.sin(yaw - a.yaw), Math.cos(yaw - a.yaw))) < 0.03)); }
    if (buttons.turn) buttons.turn.setAttribute('aria-pressed', String(turning));
    if (buttons.theme) buttons.theme.textContent = theme === 'light' ? '☾ DARK' : '☀ LIGHT';
    if (nameLine) nameLine.textContent = characters?.name().trim() || 'Sarah';
    // the outfit's new tee on or off with the outfit
    syncGarment();
  }

  /** The bump's weight, every frame: its resting tilt and where the spring has it. */
  function applyMotion(): void {
    // the bump's resting tilt from its shapes; its bounce and sway, and the breasts', are the masses' (`feelMotion`)
    const w: Record<string, number> = { ...bellyMotionWeights(bump, 0, spring, effectiveTiltDeg(body.bellyTilt, seated)), [BREAST_TARGETS.bob]: 0 };
    // THE BALANCE: her babies' weight forward of her sags her belly (baby.ts, `balanceDeg`), on the same sag shape
    w[BELLY_MOTION.tilt] += balanceTiltWeight();
    // on the way between standing and seated, her seated shapes come and go with her (`applyLook` sets them otherwise)
    const names: string[] = [BELLY_MOTION.tilt, BELLY_MOTION.bob, BELLY_MOTION.sway, BREAST_TARGETS.bob];
    if (sitMoving) { w[SEAT_TARGET] = seatCorrectiveWeight(seatShare(), bump); w[SEAT_V2_TARGET] = seatCorrectiveV2Weight(seatShare(), bump); names.push(SEAT_TARGET, SEAT_V2_TARGET); }
    for (const mesh of skinned) {
      const dict = mesh.morphTargetDictionary, influences = mesh.morphTargetInfluences;
      if (!dict || !influences) continue;
      for (const name of names) {
        const at = dict[name];
        if (at !== undefined) influences[at] = w[name];
      }
      applyRecoveredBaseline(mesh, bump, names);
    }
  }

  /** The raised-arm shapes follow the same override as the bones, on every skinned surface. */
  function armRaiseWeights(): Record<string, number> {
    const out: Record<string, number> = { [ARM_RAISE_TARGETS.plusX]: 0, [ARM_RAISE_TARGETS.minusX]: 0 };
    if (!rig || !measure || (pose !== 'tpose' && (levelArmsModel(SARAH_LAB_MODELS[modelIndex].id) || !armsOverride))) return out;
    const side = ARM_SIDES[armSide], w = armRaiseWeight(armsDeg);
    for (const [arm, on] of [[measure.joints.shoulderL, side !== 'right'], [measure.joints.shoulderR, side !== 'left']] as const) {
      if (!on) continue;
      out[(rig.bind[arm]?.x ?? 0) >= 0 ? ARM_RAISE_TARGETS.plusX : ARM_RAISE_TARGETS.minusX] = w;
    }
    return out;
  }

  /**
   * What a BUILD line adds: her standing height on HEIGHT, and on a length its limit when it holds there -- a segment
   * never shorter than 40% of itself nor longer than 2.3x, so HEIGHT and its own slider together can reach a point past
   * which the slider moves nothing, and the line says so rather than looking as if it still worked.
   */
  function buildNote(key: BodyControl): string {
    if (!buildRig) return '';
    if (key === 'height') return ` · ${heightLine(buildAmounts(body, buildRig.measure), buildRig.measure)}`;
    const seg = SEGMENT_OF[key];
    if (!seg || !heldSegments(body, buildRig.measure).includes(seg)) return '';
    return buildAmounts(body, buildRig.measure).add[seg] < 0 ? ' · at its shortest' : ' · at its longest';
  }
  /** What a WALK line adds once she has walked: what the slider gives her, in centimetres. */
  function walkNote(key: BodyControl): string {
    // her LEAN: as she stands on the treadmill now -- her trunk's lean (forward or back) and her hips
    if (key === 'walkLean') {
      const fwd = model ? new THREE.Vector3(0, 0, 1).applyQuaternion(model.quaternion) : new THREE.Vector3(0, 0, 1);
      const deg = ((levelWant.lean[0] * fwd.x + levelWant.lean[1] * fwd.z) * 180) / Math.PI, hips = (levelWant.hips[0] * fwd.x + levelWant.hips[1] * fwd.z) * 100;
      if (!onStage() || (Math.abs(deg) < 0.05 && Math.abs(hips) < 0.05)) return '';
      return ` · trunk ${Math.abs(deg).toFixed(1)}° ${deg >= 0 ? 'forward' : 'back'}, hips ${Math.abs(hips).toFixed(1)} cm ${hips >= 0 ? 'forward' : 'back'}`;
    }
    const f = walkFeet, range = bobRange();
    if (!f || !range || (key !== 'walkBob' && key !== 'walkSway')) return '';
    const cm = (m: number) => (m * 100).toFixed(1);
    if (key === 'walkBob') return ` · up and down ${cm(Math.min(1, (WALK_WEIGHT.bob * body.walkBob) / 100) * (range.most - range.least))} cm`;
    return ` · ${cm(((WALK_WEIGHT.sway * body.walkSway) / 100) * f.leg)} cm each way`;
  }

  /** Her build as the controls ask for it, on the body measured (approved while there is none). */
  function currentBuild(): { readonly amounts: BuildAmounts | null; readonly key: string } {
    if (!buildRig) return { amounts: null, key: '' };
    const amounts = buildAmounts(body, buildRig.measure);
    return { amounts, key: buildKey(amounts) };
  }

  /** The step after her shape fields that lays her build on one mesh (nothing for the approved build). */
  function buildPost(mesh: THREE.SkinnedMesh, fields: ShapeFields, build: ReturnType<typeof currentBuild>): ShapePost | null {
    const rig = buildRig, amounts = build.amounts;
    if (!rig || !amounts || !build.key) return null;
    return {
      key: build.key,
      apply: (position, normal, normalized) => {
        let f = buildFields.get(mesh);
        if (!f) { f = buildMeshFields(rig, mesh, fields.basePos, slimRest(mesh, fields.basePos)); buildFields.set(mesh, f); }
        applyBuildToMesh(f, amounts, position, normal, normalized);
      },
    };
  }

  /**
   * Her rest shape at 0% (her base mesh carries the 100% bump; the `belly` target takes it to none), which her waist and
   * hips are widened from: on her real waist, with the bump riding out on it rather than stretched sideways.
   */
  function slimRest(mesh: THREE.SkinnedMesh, base: Float32Array): Float32Array {
    const k = mesh.morphTargetDictionary?.[BELLY_TARGET], delta = k === undefined ? undefined : mesh.geometry.morphAttributes.position?.[k];
    if (!delta || !mesh.geometry.morphTargetsRelative) return base;
    const out = base.slice();
    for (let i = 0; i < Math.min(delta.count, out.length / 3); i += 1) { out[3 * i] += delta.getX(i); out[3 * i + 1] += delta.getY(i); out[3 * i + 2] += delta.getZ(i); }
    return out;
  }

  /**
   * Where her build's bones carry the given vertices of a mesh at rest (geometry units, 3 a vertex): Σ weight × that
   * bone's offset. Null for the approved build. Her crease is looked for on her shape with this added (bodyCrease.ts).
   */
  function buildShift(mesh: THREE.SkinnedMesh, vertices: Uint32Array): Float32Array | null {
    const rig = buildRig, build = currentBuild();
    if (!rig || !build.amounts || !build.key || !mesh.isSkinnedMesh) return null;
    const offsets = buildBoneOffsets(rig, build.amounts, new Float64Array(3 * rig.bones.length));
    const si = mesh.geometry.getAttribute('skinIndex'), sw = mesh.geometry.getAttribute('skinWeight');
    if (!si || !sw) return null;
    const map = mesh.skeleton.bones.map((bone) => rig.index.get(bone) ?? -1), out = new Float32Array(3 * vertices.length);
    for (let i = 0; i < vertices.length; i += 1) {
      const v = vertices[i];
      for (let j = 0; j < 4; j += 1) {
        const w = sw.getComponent(v, j), k = map[si.getComponent(v, j)] ?? -1;
        if (!(w > 0) || k < 0) continue;
        out[3 * i] += w * offsets[3 * k]; out[3 * i + 1] += w * offsets[3 * k + 1]; out[3 * i + 2] += w * offsets[3 * k + 2];
      }
    }
    return out;
  }

  /** The cloth tee cut again for her shape: her build's bones included, so a longer torso is a longer tee. */
  function refitCloth(c: ClothShirt): void {
    c.setRestShift(restShiftNow());
    c.refit();
  }
  /** Her build's rest shift over every vertex of her body, for a garment's pattern (`ClothSkin.restShift`). */
  function restShiftNow(): Float32Array | null {
    const b = bodyOf();
    return b ? buildShift(b.mesh, Uint32Array.from({ length: b.mesh.geometry.getAttribute('position').count }, (_, i) => i)) : null;
  }
  /** Her shape, as a key: when it changes, the tees are cut again for her. */
  function shapeKeyNow(): string { return `${bump}|${serializeShape(body)}|${bellyCurve}|${refine}`; }

  /** Her bones take the build (offsets and sizes), and standing she is lifted onto her soles; only when it changed. */
  function layBuildBones(build: ReturnType<typeof currentBuild>): void {
    if (!buildRig || build.key === bonesBuilt) return;
    bonesBuilt = build.key;
    const amounts = build.amounts ?? buildAmounts(defaultBodyShape(), buildRig.measure);
    applyBuildToBones(buildRig, amounts);
    // (and in her sneakers, up on their soles: their height under the ball of her foot, at her foot's size -- and her
    // build laid on them as on her skin)
    standLift = standingLift(buildRig, amounts) + (sneakersShown() ? sneakers!.lift * amounts.feet : 0);
    sneakers?.fit(buildRig, amounts, build.key);
    place();
  }

  /** Her shape fields' weights at a belly size: her controls', and her refined 0% shape fading out (zeroRefine.ts: by 200% on HYBRID, 80% on the others). */
  function fieldWeightsAt(b: number): Record<string, number> {
    const out: Record<string, number> = { ...bodyShapeFieldWeights(body, b, bellyCurve), [ZERO_FIELD]: zeroRefineWeight(b, bellyCurve) };
    // her birth area, shaped the same at every size (birthArea.ts)
    // (its folds fuller only while nothing is worn over them: a fitted bottom is a few millimetres off her skin)
    out[BIRTH_CLEFT_FIELD] = birthAreaShown ? 1 : 0;
    out[BIRTH_LIPS_FIELD] = birthAreaShown ? (lowerCovered() ? LIPS_COVERED : 1) : 0;
    birthShadeU.shade.value = birthAreaShown && !lowerCovered() ? 1 : 0;
    // her inner thighs out of the way of her birth area in a birth position (birthThighs.ts)
    out[BIRTH_THIGHS_FIELD] = isBirthPose(pose) ? 1 : 0;
    // her fingers round where her mesh joined them (fingerSplit.ts) -- while her own fingers are drawn, only the ring where
    // her skin ends, smoothed (ownFingers.ts)
    const own = !!ownFingers && ownFingersOn;
    // (and her file's fingers, drawn, given the finger's shape -- which rounds them itself)
    const formed = !own && fingersFormed > 0 && fingersFormOn;
    out[FINGERS_ROUND_FIELD] = fingersRoundOn && !own && !formed ? 1 : 0;
    out[FINGERS_FORM_FIELD] = formed ? 1 : 0;
    out[OWN_SEAM_FIELD] = own ? 1 : 0;
    // and more room between her legs there (birthGap.ts)
    out[BIRTH_GAP_FIELD] = isBirthPose(pose) && birthGapOn ? 1 : 0;
    // her bare feet over her foot bones (footCover.ts): barefoot only, her sneakers are fitted to her foot as it was
    out[FOOT_COVER_FIELD] = sneakersShown() ? 0 : 1;
    // (only with her hips bent up: standing with her legs apart her buttocks hang as they are)
    out[BIRTH_SEAT_FIELD] = !birthSeatOn ? 0 : pose === 'recline' ? 1 : pose === 'squat' ? birthSeatSquat : 0;
    out[BIRTH_ROOM_FIELD] = isBirthPose(pose) && birthRoomOn ? 1 : 0;
    out[BIRTH_NORMALS_FIELD] = isBirthPose(pose) && birthNormalsOn ? 1 : 0;
    out[BIRTH_KNEES_FIELD] = isBirthPose(pose) && birthKneesOn ? 1 : 0;
    out[KNEE_TURN_FIELD] = kneeTurnHere() ? 1 : 0;
    out[HIP_TURN_FIELD] = hipTurnHere() ? 1 : 0;
    out[BIRTH_CONTACT_FIELD] = pose === 'squat' && birthContactOn ? Math.max(0, contactValve.x) : 0;
    // AUTO DEPTH: her belly deepened by as much as her babies need (baby.ts, `babiesInHer`), on her own DEPTH
    if (babyAutoDepth) out[DEPTH_FIELD] = (out[DEPTH_FIELD] ?? 0) + bodyShapeFieldWeights({ ...body, bellyDepth: babyAutoDepth }, b, bellyCurve)[DEPTH_FIELD];
    // her upper belly smoothed, by each belly key's own weight (zeroRefine.ts)
    for (const [key, w] of Object.entries(bellyWeights(b, bellyCurve))) out[UPPER_FIELD_PREFIX + key] = w;
    // her sides and the underside of her belly smoothed, by a tent over the sizes they were baked at (zeroRefine.ts)
    Object.assign(out, sidesFieldWeights(b, sidesAt, bellyCurve));
    // her baby's weight: her belly carried by the womb inside it (zeroRefine.ts), once its file is in
    Object.assign(out, babyFieldWeights(b, body.babyWeight, babyAt, bellyCurve));
    // her cleavage smoothed, and milk in her breasts, once its file is in (zeroRefine.ts)
    Object.assign(out, chestFieldWeights(b, chestAt, bellyCurve));
    Object.assign(out, groinFieldWeights(b, groinAt, bellyCurve));
    Object.assign(out, milkFieldWeights(b, body.milk, body.milkBalance, milkAt, bellyCurve));
    return out;
  }

  // Clothing owns these bindings; a new body gets new bindings. Native garment fields stay intact.
  const garmentTransfers = new WeakMap<THREE.SkinnedMesh, GarmentShapeTransfer>();
  function followMissingGarmentFields(weights: Readonly<Record<string, number>>): void {
    const b = bodyOf(), source = b ? shaped.find((s) => s.mesh === b.mesh) : undefined;
    if (!b || !source) return;
    const wanted = new Set([...source.fields.fields.keys()].filter((n) => !!weights[n] && (n.startsWith('shape:baby:') || n.startsWith('shape:milk:'))));
    if (!wanted.size) return;
    const targets = shaped.filter((s) => s.mesh.userData.recoveredShirt || s.mesh.userData.recoveredLeggings);
    if (!targets.length) return;
    let transfer = garmentTransfers.get(b.mesh);
    if (!transfer) { transfer = new GarmentShapeTransfer(b.mesh, source.fields); garmentTransfers.set(b.mesh, transfer); }
    for (const target of targets) target.fields = transfer.sync(target.mesh, target.fields, source.fields, (name) => wanted.has(name)).fields;
  }

  function applyLook(): void {
    babyDirty = true;
    const drawn = shownBump(); bellySettleApplied = bellySettle;
    const fieldWeights = fieldWeightsAt(drawn);
    followMissingGarmentFields(fieldWeights);
    const build = currentBuild();
    for (const { mesh, fields } of shaped) applyShapeFields(mesh, fields, {
      ...fieldWeights,
      ...(mesh.userData.recoveredShirt ? fitWeights(drawn, 'shape:fitBelly') : {}),
      ...(mesh.userData.recoveredShirt ? fitWeights(drawn, 'shape:fineFit', SHIRT_FINE_FIT_KEYS) : {}),
      ...(mesh.userData.recoveredLeggings ? fitWeights(drawn, 'shape:recoveryLeggings', LEGGINGS_FIT_KEYS) : {}),
    // recovered clothes keep RAW normal sums so the GPU's belly offsets land on what their fit expects; the leggings
    // were normalized here too, and at 0-50% the large belly offsets flipped normals in the fold under her belly
    }, { normalizeNormals: !(mesh.userData.recoveredShirt || mesh.userData.recoveredLeggings), post: buildPost(mesh, fields, build) });
    layBuildBones(build);
    // her middle -- the skin round and behind her vulva -- kept with her pelvis in a birth position (birthWeights.ts;
    // Joshua, 2026-10-30, of RECLINE with it: "Looks a lot better"); the rebuilt area reads her weights again
    // (in SQUAT her lower buttocks stay with her pelvis too, hanging between her heels -- with her thighs they were drawn
    // forward into two hollows with her middle pinched between, Joshua 2026-10-31; RECLINE keeps them with her thighs)
    if (birthWeights?.apply(birthMaskOverride ?? (isBirthPose(pose) ? BIRTH_WEIGHTS.share : 0), pose === 'squat' ? squatBack : BIRTH_WEIGHTS.backShare)) vulva?.resyncWeights();
    // and her heels with her feet, not half with her shins (ankleWeights.ts; Joshua, 2026-11-04: pointed flat on the mat
    // sat back, the back of her ankle crumpled)
    ankleWeights?.apply(isBirthPose(pose) && ankleWeightsOn ? 1 : 0);
    // and each finger's skin with that finger, not half with the ones beside it (fingerWeights.ts; P4, 2026-11-05: her
    // index finger pointing at a button was drawn curled in her fist with a spike of skin out to it)
    if (fingerWeights?.apply(fingerWeightsOn ? 1 : 0)) { const bm = bodyOf()?.mesh; if (bm) contactLocal.delete(bm); }
    // and her own fingers made again on her ring if her shape or her weights moved it (ownFingersMesh.ts)
    if (ownFingers?.follow()) { const bm = bodyOf()?.mesh; contactSet = null; if (bm) contactLocal.delete(bm); }
    fingerFills?.follow();
    // her navel, laid on her as just shaped (navelPiece.ts)
    layNavel(drawn);
    // which garments are drawn: the outfit editor's choice, or none while her skin is painted bare (CLOTHES · HIDDEN)
    const view = skinBare ? 'none' : garmentView;
    fabric?.setLowerBare(bottomsOff());
    for (const mesh of skinned) {
      const dict = mesh.morphTargetDictionary, influences = mesh.morphTargetInfluences;
      // the fitted light tee keeps its own navel's shape as fitted for her size: NAVEL DETAIL settles it in the shader
      // (clothFlatten). Settled by the morph instead -- as paint under it at a low NAVEL DETAIL used to do (the painted
      // leggings over her navel) -- its navel, which past 125% stands above hers, was pushed into her: a hole in the tee.
      if (dict && influences) for (const [name, w] of Object.entries(lookWeights(mesh, drawn))) {
        const at = dict[name];
        if (at !== undefined) influences[at] = w;
      }
      applyRecoveredBaseline(mesh, drawn);
      const name = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material).name as Garment;
      if (([...GARMENTS, ...RECOVERED_SHIRTS] as readonly string[]).includes(name)) mesh.visible = shownNow(name);
      { const t = trimShown(name, wornGarments(outfit, garments)); if (t !== null) mesh.visible = t; }
      if (mesh.userData.replacedByRecovered) mesh.visible = false;
      // while a birth is under way her bottoms are off (leggings, the bikini, a swimsuit): bottomsOff()
      if (bottomsOff() && (LOWER_GARMENTS.includes(name) || mesh.userData.recoveredLeggings)) mesh.visible = false;
      // the cloth experiment draws the light tee as cloth: the fitted one stands aside (and keeps its fabric on)
      if ((clothWorn() || garmentRoom) && name === 'shirtSpandexLite') mesh.visible = false;
      if (cloth && name === 'shirtSpandexLite') cloth.mesh.visible = clothOn && !clothSeated && shownNow('shirtSpandexLite') && view === 'all' && !garmentRoom;
      // the new tee, drawn with her clothes (an editor's isolating view puts it aside)
      if (garmentRoom && name === 'shirtSpandexLite') garmentRoom.cloth.mesh.visible = view === 'all';
      // painting onto her body: "don't show any clothing since you would be painting over the body"; a garment
      // ISOLATED in the editor shows on its own (its trim with it)
      if (view !== 'all' && !mesh.geometry.getAttribute('_cloth_cover')) {
        const own = name.endsWith('Trim') ? name.slice(0, -4) : name;
        if (view === 'none' || own !== view) mesh.visible = false;
      }
      if (mesh.userData.recoveredLeggings) updateLeggingsHem(mesh, drawn, shownNow('shirtSpandexHigh') ? 'spandex' : 'relaxed');
      // the leggings under a worn athletic tee, the same way
      const underTop = mesh.geometry.getAttribute('_under_top');
      if (underTop && mesh.geometry.index) {
        const all = (mesh.userData.allIndices ??= mesh.geometry.index.array.slice()) as ArrayLike<number>;
        const on = shownNow(UNDER_TOP_GARMENT) ? 1 : 0;
        if (mesh.userData.coverMask !== on) {
          mesh.userData.coverMask = on;
          const bits = (mesh.userData.coverBits ??= Uint8Array.from({ length: underTop.count }, (_, i) => underTop.getX(i))) as Uint8Array;
          mesh.geometry.setIndex(new THREE.BufferAttribute(on ? uncoveredSkinIndices(all, bits, 1) : Uint32Array.from(all), 1));
        }
      }
      // the body: on v1 the skin the shown clothes cover is left out of the draw. On v2 the body is NEVER
      // hidden (Joshua, 2026-10-19: "the base body should never be hidden... clothing needs to sit over the body,
      // and/or be painted on"): every garment has to clear her skin by itself.
      const cover = mesh.geometry.getAttribute('_cloth_cover');
      if (cover && mesh.geometry.index) {
        const all = (mesh.userData.allIndices ??= mesh.geometry.index.array.slice()) as ArrayLike<number>;
        const mask = view !== 'all' || bodyNeverHidden(SARAH_LAB_MODELS[modelIndex].id) ? 0 : coverMask(wornGarments(outfit, garments));
        if (mesh.userData.coverMask !== mask) {
          mesh.userData.coverMask = mask;
          // read through getX: the file stores the bits with a stride (vertex data is 4-byte
          // aligned), so the raw array is not one entry a vertex
          const bits = (mesh.userData.coverBits ??= Uint8Array.from({ length: cover.count }, (_, i) => cover.getX(i))) as Uint8Array;
          mesh.geometry.setIndex(new THREE.BufferAttribute(mask ? uncoveredSkinIndices(all, bits, mask) : Uint32Array.from(all), 1));
        }
      }
    }
    // her rebuilt birth area drawn as her own skin under what she wears (painted leggings and all), bare where she is not
    vulva?.setDressedLips(fabric?.vulvaKeep() ?? DEFAULT_VULVA_KEEP);
    vulva?.setDressed(vulvaDressed(view));
    if (organs && !organsGrowWomb) organs.doorsShown = doorsSeen();
    layBalloonWomb();
    layCrease();
    fabric?.sync();
    // her shape may have changed: the cleavage bridge chooses its ends again
    fabric?.reshaped();
    // and the cloth tee is cut again for her shape (never for her pose) -- on the cloth's next frame, once her belly's
    // motion shapes have followed the new size too. A quick size changes her in two steps (the size here, those shapes
    // in the frame's feelMotion), and a tee cut at once, for the first, and laid on the second ballooned out in front of
    // her and creased as it fell (Joshua, 2026-10-24: "it's possible it's something else")
    const shapeKey = shapeKeyNow();
    if (cloth && shapeKey !== clothShapeKey) { clothShapeKey = shapeKey; clothRefit = true; }
    // the procedural garment a probe put on her, the same way (on its next frame)
    if (garmentRoom && shapeKey !== garmentShapeKey) { garmentShapeKey = shapeKey; garmentRefit = true; }
  }

  /**
   * A mesh's morph target weights for her look at bump `b` (applyLook's): her belly and bust at that size, her navel, the
   * refinement, the seat's correctives and her raised arms.
   */
  /**
   * How far out her navel is for pressure `o` (0..1): all of it out at all of it, in at none, in a straight line -- and
   * her NAVEL control on top (below 0 deeper in, above 0 further out, as it always was), as the in/out number navelFlat
   * takes (0 her outie, 1 an ordinary navel); her fabric's settling keeps it from standing past what she wears.
   */
  function navelXAt(o: number): number {
    // (under a cloth shirt, NAVEL DETAIL is the shirt's and never her navel's -- Joshua, 2026-11-06: "The shape can alter,
    // but, only based on the slider through clothes, it doesn't affect the main bellybutton shape" -- so a painted layer
    // under it, her leggings' waist over her navel, does not soften her navel by it either)
    return Math.max(navelRawXAt(o), clothShirtOver() ? 0 : fabric?.navelFlatten() ?? 0, clothFlatten());
  }
  /** navelXAt without her fabric's settling: her navel itself, as the light tee takes it (it settles its own in the shader). */
  function navelRawXAt(o: number): number {
    const n = Math.min(100, Math.max(-100, Number.isFinite(body.navel) ? body.navel : 0)) / 100;
    const outie = n < 0 ? o + n * (o + NAVEL_INNIE_EXTRA) : o + n * (1 + NAVEL_OUTIE_EXTRA - o);
    return 1 - outie;
  }
  /**
   * Her navel's in/out number as DRAWN now -- what her fitted clothes' navels take (NAVEL_FLAT_TARGET). Her body's navel
   * is laid in and all the way out and blended by the shaders by her spring (navelSoft.ts), so this is the same blend of
   * the two numbers it was last laid from (`navelLaid`). It once took `navelFlatFor(navelPress, ...)`, a belly PERCENT
   * fed the 0..1 pressure: her clothes' navels stayed in while hers pushed out through them (Joshua, 2026-11-03: "the
   * bellybutton pokes through all the clothes again"). `raw`: without her fabric's settling (the light tee's).
   */
  function navelDrawn(raw: boolean): number {
    if (!navelSoft || !navelLaid) return raw ? navelRawXAt(navelPress) : navelXAt(navelPress);
    const [xIn, xOut] = raw ? navelLaid.raw : navelLaid.x;
    return xIn + navelSoft.out.value * (xOut - xIn);
  }
  /** Her fitted clothes' navels where hers is drawn now (applyLook's weights, and every frame as her spring moves her). */
  function navelForClothes(mesh: THREE.SkinnedMesh): number | null {
    if (navel && mesh === navel.mesh) return null;
    const liteTee = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material).name === 'shirtSpandexLite';
    return liteTee ? Math.min(1, Math.max(0, navelDrawn(true))) : navelDrawn(false);
  }
  /** The NAVEL line's: what presses her navel and how far out it is now. */
  function navelLine(): string {
    const out = 1 - navelX(0);
    return `pressure ${Math.round(navelPress * 100)}% · ${out < 0.05 ? (out < -0.02 ? 'deeper innie' : 'innie') : `outie ${Math.round(Math.min(1, out) * 100)}%`}`;
  }
  /** Her navel's in/out number as she is now (what her clothes' navels take). */
  function navelX(_b: number): number { return navelXAt(navelSoft ? navelSpring.x : navelPress); }
  /** Lay her navel (navelPiece.ts) on her body as shaped for bump `b`: in, and all the way out for the shaders to blend. */
  function layNavel(b: number): void {
    if (!navel) return;
    const lw = lookWeights(navel.mesh, b);
    if (navelSoft) { const x: [number, number] = [navelXAt(0), navelXAt(1)]; navelLaid = { x, raw: [navelRawXAt(0), navelRawXAt(1)] }; navelSoft.lay(lw, x[0], x[1]); }
    else navel.piece.apply(navel.mesh, lw, navelX(b));
  }

  function lookWeights(mesh: THREE.SkinnedMesh, b: number): Record<string, number> {
    const dict = mesh.morphTargetDictionary ?? {};
    // the fitted light tee keeps its own navel's shape as fitted for her size: NAVEL DETAIL settles it in the shader
    const liteTee = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material).name === 'shirtSpandexLite';
    const w: Record<string, number> = { ...bellyWeights(b, bellyCurve), ...breastWeightsForShape(b, dict[BREAST_GROW_TARGET] !== undefined, body.breastSize), [BELLY_UPPER_TARGET]: bellyUpperWeight(b, bellyCurve), ...navelWeights(b, body.navel), [NAVEL_FLAT_TARGET]: liteTee ? Math.min(1, Math.max(0, navelDrawn(true))) : navelDrawn(false), [BELLY_REFINE_TARGET]: refineWeight(refine, b), [SEAT_TARGET]: seatCorrectiveWeight(seatShare(), b), [SEAT_V2_TARGET]: seatCorrectiveV2Weight(seatShare(), b), ...armRaiseWeights() };
    // her approved body's navel is its own piece (navelPiece.ts), laid from the number navelFlat always took: the file's
    // navel morphs stay at zero on her
    if (navel && mesh === navel.mesh) for (const name of NAVEL_MORPHS) if (name in w) w[name] = 0;
    return w;
  }

  /**
   * Her REST shape as designed at 0% belly, for `measure` (the new tee's readings of her design, `RoomGarment.designRest`):
   * her 0% shape fields, and her navel laid for the 'belly' target alone -- all those readings add to her rest shape --
   * then put back as she is. Only her body's rest shape: her morph weights are the reader's own business.
   */
  function designRest(measure: () => void): void {
    const s = shaped.find((x) => !!x.mesh.geometry.getAttribute('_cloth_cover')), mesh = s?.mesh as THREE.SkinnedMesh | undefined;
    if (!s || !mesh) { measure(); return; }
    const opts = { normalizeNormals: true, post: buildPost(mesh, s.fields, currentBuild()) };
    applyShapeFields(mesh, s.fields, fieldWeightsAt(0), opts);
    if (navel && navel.mesh === mesh) navel.piece.apply(mesh, { belly: 1 }, navelXAt(0));
    try { measure(); } finally {
      applyShapeFields(mesh, s.fields, fieldWeightsAt(bump), opts);
      if (navel && navel.mesh === mesh) layNavel(bump);
    }
  }

  /**
   * BELLY ROOM's reading of her (`GarmentCloth.roomShape`): runs `measure` with her body shaped as she is but for her belly,
   * at `share` of 100% -- her shape fields and morph targets as applyLook lays them at that size -- and puts her back.
   * Only her body: no other mesh, nothing drawn in between.
   */
  function roomShape(share: number, measure: () => void): void {
    const s = shaped.find((x) => !!x.mesh.geometry.getAttribute('_cloth_cover')), mesh = s?.mesh as THREE.SkinnedMesh | undefined;
    if (!s || !mesh) { measure(); return; }
    const inf = mesh.morphTargetInfluences, dict = mesh.morphTargetDictionary, keep = inf ? inf.slice() : null;
    const opts = { normalizeNormals: true, post: buildPost(mesh, s.fields, currentBuild()) };
    applyShapeFields(mesh, s.fields, fieldWeightsAt(share * 100), opts);
    if (inf && dict) for (const [name, w] of Object.entries(lookWeights(mesh, share * 100))) { const at = dict[name]; if (at !== undefined) inf[at] = w; }
    if (navel && navel.mesh === mesh) layNavel(share * 100);
    try { measure(); } finally {
      applyShapeFields(mesh, s.fields, fieldWeightsAt(bump), opts);
      if (inf && keep) for (let j = 0; j < keep.length; j++) inf[j] = keep[j];
      if (navel && navel.mesh === mesh) layNavel(bump);
    }
  }

  /**
   * Her crease (`bodyCrease.ts`, Joshua, 2026-10-26: "blend and merge that area smoother"): a shape it was worked out for
   * is laid again at once; a new one is worked out once her controls have rested, so a drag stays quick.
   */
  function layCrease(): void {
    const s = shaped.find((x) => !!x.mesh.geometry.getAttribute('_cloth_cover'));
    if (!s?.fields.baseNrm || creaseDisabled) return;
    if (crease.relay(s.mesh, s.fields.last, s.fields.basePos, s.fields.baseNrm)) { if (creaseTimer) { clearTimeout(creaseTimer); creaseTimer = 0; } return; }
    if (creaseTimer) clearTimeout(creaseTimer);
    creaseTimer = window.setTimeout(() => { creaseTimer = 0; if (!disposed && !creaseDisabled) crease.request(); }, CREASE_SETTLE_MS);
  }

  /** The outfit as the OUTFIT button names it: on v2 the first two are the relaxed tee over either rise. */
  function outfitName(index: number): string {
    return recovered && index < 2 ? `relaxed + ${index === 0 ? 'high' : 'low'} leggings` : outfitLine(index).replace(/^OUTFIT · /, '');
  }

  /** A new load for the card: what it is called and where it sits. */
  function begin(label: string, place: LoadingPlace): void {
    meter.start(label);
    cardPlace = place;
    batch++;
  }

  /** The room is usable once the GPU has her: compile what is new, then two frames drawn, then the card goes. */
  function settle(): void {
    const b = batch;
    void ctx.renderer.gl.compileAsync(three, camera).catch(() => {}).then(() => { if (b === batch) { readyBatch = b; readyIn = 2; } });
  }

  const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
  function failLoad(what: string, again: () => void): void {
    retry = again;
    meter.fail(offline() ? `This device is offline, so ${what} could not be downloaded. Connect, then tap Retry.` : `${what[0].toUpperCase()}${what.slice(1)} could not be downloaded. Check your connection, then tap Retry.`);
  }

  /** Fetch one recovered file, or join the fetch already under way. */
  function requestPart(part: RecoveredPart, onDownloaded?: () => void): Promise<THREE.Object3D> {
    const running = inflight.get(part);
    if (running) { meter.expect(recoveredPartPath(part), assets.assetBytes(recoveredPartPath(part))); return running.promise; }
    const abort = new AbortController();
    const promise = assets.loadModel(recoveredPartPath(part), () => new THREE.Object3D(), { meter, signal: abort.signal, onDownloaded });
    inflight.set(part, { promise, abort });
    // a small file goes on her the moment it lands, whatever became of the outfit that asked for it (the opening's
    // land before her body is built, and the opening puts them on)
    const body = model;
    if (!isShirtPart(part)) promise.then((scene) => { if (!disposed && body && model === body && !scene.userData.isPlaceholder && !partMeshes.has(part)) wearPart(part, scene); }, () => {});
    const forget = () => { if (inflight.get(part)?.promise === promise) inflight.delete(part); };
    promise.then(forget, forget);
    return promise;
  }

  /** Put a fetched file's meshes on her (bound to her live skeleton, hidden until an outfit shows them). */
  function wearPart(part: RecoveredPart, scene: THREE.Object3D): void {
    const skin = model ? findSkinnedMesh(model) : null;
    if (!skin || scene.userData.isPlaceholder || partMeshes.has(part)) { release(scene); return; }
    if (isShirtPart(part)) {
      // one imported shirt in memory: the one she is putting on replaces the last
      for (const [p, old] of [...partMeshes]) {
        if (!isShirtPart(p)) continue;
        skinned = skinned.filter(m => !old.includes(m)); shaped = shaped.filter(x => !old.includes(x.mesh));
        if (p === 'spandex-lite') { dropCloth(); fitted = null; fittedLaid = false; }
        releaseRecoveredMeshes(old); partMeshes.delete(p);
      }
    }
    const meshes = attachRecoveredMeshes(scene, skin, isShirtPart(part) ? shirtOfPart(part) : undefined);
    for (const mesh of meshes) {
      if (part.startsWith('leggings')) mesh.userData.recoveredLeggings = true;
      skinned.push(mesh);
      const fields = liftShapeFields(mesh) ?? (recovered ? baseShapeFields(mesh) : null);
      if (fields) shaped.push({ mesh, fields });
      dropIdleMorphs(mesh);
      attachJiggle(mesh, jiggle, legBonesOf());
    }
    partMeshes.set(part, meshes);
  }

  /**
   * PUT ON OUTFIT `next`. With all its clothes on hand it is immediate; otherwise she keeps what she has on while the
   * missing files download (the card at the top says how far), and changes when they are all in. `opening` is the
   * room's first dressing: it carries on the opening's load rather than starting its own.
   */
  /** A painted outfit's paint goes on with it (and comes off when a modelled one is chosen). */
  function wearPaint(): void {
    fabric?.wearOutfit(recovered ? OUTFITS[outfit]?.paint ?? null : null, recovered ? OUTFITS[outfit]?.fabrics : undefined);
    // the new tee's settings: the save's, or the outfit's own
    adoptGarment(pendingClothes?.garment ?? null);
    // saved clothes put on with this outfit go on over its defaults
    if (pendingClothes && fabric?.putOnClothes(pendingClothes)) { builder?.load(pendingClothes.built ?? null); pendingClothes = null; }
    // what she has on now is what the editor's SAVE compares against
    if (fabric && !pendingClothes) { outfits?.editing(nextSource ?? { kind: 'builtin', name: OUTFITS[outfit].name }); nextSource = null; }
  }
  /** What she wears now, as a save holds it: the outfit, the editor's paint and fabrics, and any built pieces. */
  function currentClothes(): SavedClothes {
    const built = builder?.built() ?? null;
    // an outfit whose tee is the new one keeps its settings and the dials it is worn with (never its mesh)
    const garment: GarmentRecord | null = OUTFITS[outfit]?.procedural ? { version: GARMENT_RECORD_VERSION, settings: garmentSettings, dials: clothTune } : null;
    return { outfit: OUTFITS[outfit].name, ...(fabric?.clothes() ?? { shirtLength: DEFAULT_SHIRT_LENGTH, layers: [], garments: {} }), ...(built ? { built } : {}), ...(garment ? { garment } : {}), shoes: sneakersOn ? 'sneakers' : 'none' };
  }
  /**
   * The new tee's settings as an outfit goes on (Stage 3): a save's record -- its settings and the cloth dials it was
   * worn with -- or, with none (any save from before it, or the outfit chosen), the outfit's own: the approved tee in the
   * outfit's construction. The tee she has on is cut to them at once, and tailored again if they draft another pattern.
   */
  function adoptGarment(record: GarmentRecord | null): void {
    const own = OUTFITS[outfit]?.procedural;
    if (!own) return;
    garmentSettings = record ? clampGarmentSettings(record.settings) : withConstruction(GARMENT_DEFAULTS, own);
    garmentCommitted = tailorKey(garmentSettings);
    if (record) {
      clothTune = { ...CLOTH_TUNE_DEFAULT, ...record.dials };
      for (const [k, i] of clothDialInputs) i.value = String(clothTune[k as keyof ClothTune]);
      tuneCloth();
    }
    if (garmentRoom && garmentAuto) garmentRoom.cut(garmentSettings);
  }
  /**
   * The new tee's panel moved a control (`garmentPanel.ts`): kept at once, and the tee she has on cut to it -- an instant
   * setting is the cut itself; a re-tailor one drafts another pattern, which is tailored when `final` (let go: `syncGarment`).
   * BELLY ROOM cuts the cloth's own lengths: on its next refit.
   */
  function garmentChanged(next: GarmentSettings, final: boolean): void {
    const was = garmentSettings;
    garmentSettings = clampGarmentSettings(next);
    if (final) garmentCommitted = tailorKey(garmentSettings);
    if (garmentRoom && garmentAuto) {
      garmentRoom.cut(garmentSettings);
      if (garmentSettings.bellyRoom !== was.bellyRoom) garmentRefit = true;
    }
    refresh();
  }
  /** Put saved clothes on her: their outfit first if it is another, then every piece as saved. */
  function putOnSaved(saved: SavedClothes, from: string | null, source: OutfitSource): void {
    wornFrom = from;
    nextSource = source;
    // her shoes as the save has them (a save from before them, or one of the room's outfits, leaves her feet as they are)
    if (saved.shoes && (saved.shoes === 'sneakers') !== sneakersOn) setSneakers(saved.shoes === 'sneakers');
    const { outfit: name, ...rest } = saved;
    const index = OUTFITS.findIndex((o) => o.name === name);
    pendingClothes = rest;
    if (index >= 0 && index !== outfit) dress(index);
    else {
      adoptGarment(rest.garment ?? null);
      if (fabric?.putOnClothes(rest)) { builder?.load(rest.built ?? null); pendingClothes = null; outfits?.editing(source); nextSource = null; }
      applyLook(); refresh();
    }
  }
  /**
   * CLOTH SIM on or off. The first time, the cloth file is fetched (a third of a megabyte) and laid on her as she stands;
   * after that it is kept, hidden while off, and started again from her body when it comes back on.
   */
  async function toggleCloth(): Promise<void> {
    if (clothLoading) return;
    clothOn = !clothOn;
    // her detail through the tee is the cloth's: the fitted tee shares its material, and shows its own
    if (!clothOn && cloth) { setClothDetail(cloth.mesh.material as THREE.Material, null); setClothNeckline(cloth.mesh.material as THREE.Material, null); setClothTrim(cloth.mesh.material as THREE.Material, null); }
    if (!clothOn || cloth) { if (cloth) { cloth.mesh.visible = clothOn; if (clothOn) clothRestart = true; } applyLook(); refresh(); fabric?.refreshTargets(); return; }
    const body = skinned.find((m) => !!m.geometry.getAttribute('_cloth_cover')), tee = partMeshes.get('spandex-lite')?.[0];
    if (!model || !body || !tee) { clothOn = false; refresh(); return; }
    clothLoading = true; refresh();
    begin('Loading the cloth tee', 'aside');
    meter.expect(CLOTH_SHIRT_PATH, assets.assetBytes(CLOTH_SHIRT_PATH));
    const expected = model;
    try {
      const scene = await assets.loadModel(CLOTH_SHIRT_PATH, () => new THREE.Object3D(), { meter });
      let source: THREE.Mesh | null = null;
      scene.traverse((n) => { if (!source && (n as THREE.Mesh).isMesh) source = n as THREE.Mesh; });
      if (disposed || model !== expected || !source || scene.userData.isPlaceholder) { release(scene); clothOn = false; return; }
      model.updateMatrixWorld(true);
      // its dials as they stand (CLOTH_DIALS: weighty and snug to start)
      const tuning = clothTuning(clothTune);
      cloth = new ClothShirt(source, body, tee.material, tuning.settings, tuning.standOff);
      release(scene);
      applyTeeLength();
      cloth.setSleeves(sleeves);
      cloth.setNeckline(neckline / 100, neckShape);
      cloth.mesh.visible = clothOn;
      three.add(cloth.mesh);
      meter.ready();
    } catch (error) {
      console.error('[sarahlab] the cloth tee could not be laid on her', error);
      clothOn = false;
      meter.fail('The cloth tee could not be downloaded. Check your connection, then tap CLOTH SIM again.');
    } finally { clothLoading = false; applyLook(); refresh(); fabric?.refreshTargets(); }
  }
  /** The cloth comes on by itself when she has the light tee on and CLOTH SIM has not been switched off. */
  function wantCloth(): void {
    if (clothWanted && !clothOn && !clothLoading && recovered && partMeshes.get('spandex-lite')?.[0] && shownNow('shirtSpandexLite') && !OUTFITS[outfit]?.procedural) void toggleCloth();
  }
  /**
   * THE NEW TEE AS AN OUTFIT (Joshua, 2026-10-27: "Add both to outfit list and both shirts have simulated shirts. Make
   * the new shirt the default, and the other shirt as the second option to compare"): an outfit whose tee is the
   * procedural garment puts it on her -- tailored to her where she stands, eased on weightless and settled, as the
   * review probes do it -- once the light tee it borrows its material from is in; any other outfit takes it off and
   * gives the light tee its cloth copy back. Tailoring is a few seconds' work on the page, so the loading card says so.
   */
  function syncGarment(): void {
    if (garmentProbed || garmentTailoring) return;
    const want = OUTFITS[outfit]?.procedural ?? null;
    const tee = partMeshes.get('spandex-lite')?.[0];
    if (want && loaded && recovered && tee && model) {
      // on her already, drafted as its settings ask once let go (a re-tailor control let go, a save put on, tailors anew;
      // she keeps the one she has on until the new one is ready -- the Stage 1 plan's re-tailor)
      if (garmentRoom && garmentAuto === want && garmentRoom.tailorKey === garmentCommitted) return;
      garmentTailoring = true;
      begin('Tailoring the new tee', model.visible ? 'aside' : 'centre');
      setTimeout(() => {
        garmentTailoring = false;
        if (disposed || OUTFITS[outfit]?.procedural !== want || garmentProbed) { settle(); return; }
        // the light tee's cloth copy stands aside: the new tee wears its material
        if (cloth) { cloth.mesh.visible = false; }
        putOnGarment(garmentSettings.construction, garmentSettings.gusset, false, {}, garmentSettings);
        garmentAuto = garmentRoom ? want : null; garmentDressT = 0;
        if (garmentRoom) garmentRoom.cloth.weightless = true;
        applyLook(); refresh(); settle();
      }, 30);
      return;
    }
    if (!want && garmentAuto) { takeOffGarment(); garmentAuto = null; applyLook(); }
    if (!want) wantCloth();
  }
  /** The procedural tee off her, and the light tee's cloth copy drawn again if it is on. */
  function takeOffGarment(): void {
    // its cut edge goes with it: the material is the light tee's, which the cloth and fitted tees wear too
    if (garmentRoom) setCutEdge(garmentRoom.cloth.mesh.material as THREE.Material, false);
    garmentRoom?.dispose(); garmentRoom = null; garmentPoseKey = '';
    if (cloth && clothOn) cloth.mesh.visible = true;
  }
  /** Her body the tees are laid on (the mesh that carries the cloth's cover). */
  const clothBody = () => skinned.find((m) => !!m.geometry.getAttribute('_cloth_cover')) ?? null;
  /**
   * Put the procedural tee on her, or take it off (null): tailored to her as she is now, in the light tee's own material
   * (its FABRIC), or a plain one for a wireframe or a room without that tee. For the outfit and for the review probes.
   */
  function putOnGarment(construction: 'raglan' | 'setIn' | null, gusset = 0.5, wire = false, extra: { neckWidth?: number; neckDrop?: number; bustShaping?: 'none' | 'ease' | 'dart'; neckBand?: number; armholeBand?: number; detail?: boolean } = {}, garment?: GarmentSettings) {
    takeOffGarment();
    if (!construction) { applyLook(); return null; }
    const body = skinned.find((m) => !!m.geometry.getAttribute('_cloth_cover'));
    if (!body || !model) return null;
    model.updateMatrixWorld(true);
    const { settings, standOff } = clothTuning(clothTune);
    // it wears the cloth tee's own material, and so the room's FABRIC on it, as the cloth tee does (Joshua, 2026-10-27:
    // "Made the new shirt also the same red color and compare"): the light tee's material, whose neckline and trim cuts
    // are the cloth tee's own and are switched off while the garment is on. A wireframe, or a room without that tee,
    // draws in a plain material of its own (drawn a hair in front of her skin where the two touch)
    const teeMaterial = partMeshes.get('spandex-lite')?.[0]?.material;
    const shared = !wire && teeMaterial && !Array.isArray(teeMaterial) ? teeMaterial : null;
    if (shared) { setClothNeckline(shared, null); setClothTrim(shared, null); }
    const material = shared ?? new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.85, side: THREE.DoubleSide, wireframe: wire, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 });
    garmentRoom = new RoomGarment({
      body, root: model, params: { construction, gusset, ...(extra.neckWidth !== undefined ? { neckWidth: extra.neckWidth } : {}), ...(extra.neckDrop !== undefined ? { neckDrop: extra.neckDrop } : {}), ...(extra.bustShaping ? { bustShaping: extra.bustShaping } : {}), ...(extra.armholeBand !== undefined ? { armholeBand: extra.armholeBand } : {}) },
      neckBand: extra.neckBand, ...(extra.detail === false ? { detail: false } : {}), settings, standOff, unitsPerMetre: M, scale: FACE_REST_SCALE, offset: FACE_REST_OFFSET, material,
      // the outfit's new tee (Stage 3): drafted to its full extent from its settings and worn as they cut it, its edge
      // drawn by the material; BELLY ROOM reads her at the room's size; FIT scales its own size
      ...(garment ? { garment, roomShape } : {}), designRest, fitScale: garmentFitScale(),
    });
    if (garment) setCutEdge(material, true);
    three.add(garmentRoom.cloth.mesh);
    garmentPoseKey = pose;
    // cut at once for her as she is now, measured from the 0% design it was tailored from (`RoomGarment`'s
    // `tailoredShape`), as the cloth tee is cut for the body it is on; her shape changing from here cuts it again
    garmentRoom.cloth.setRestShift(restShiftNow());
    garmentRoom.cloth.refit();
    garmentShapeKey = shapeKeyNow(); garmentRefit = false;
    return garmentRoom;
  }
  /** The cloth goes with the light tee it is a copy of (its material is the tee's). */
  function dropCloth(): void {
    if (cloth) { setClothDetail(cloth.mesh.material as THREE.Material, null); setClothNeckline(cloth.mesh.material as THREE.Material, null); setClothTrim(cloth.mesh.material as THREE.Material, null); }
    cloth?.dispose(); cloth = null; clothOn = false; clothShapeKey = ''; clothFlattenLaid = 0;
  }
  /**
   * How much of her shows through the cloth tee (Joshua, 2026-10-24: "the breast slider has no effect on the outfit… it
   * still should have a visible effect"; "the bellybutton also doesn't appear with the slider… the overrides should be
   * working"): BREAST and NAVEL DETAIL as the outfit editor holds them, MANUAL where set, else AUTO from the tee's fabric.
   */
  function clothKeep(): { nipple: number; navel: number } {
    return fabric?.garmentDetail('shirtSpandexLite') ?? { nipple: 0.45, navel: 0.8 };
  }
  /** How flat a garment over her middle softens her navel: what NAVEL DETAIL hides (or what a probe holds, if more). */
  function clothPress(navelKeep = clothKeep().navel): number {
    return Math.max(1 - navelKeep, navelPressHeld ?? 0);
  }
  /** A probe pressing her navel flatter under a garment (`navelClothPress` hook), or null. */
  let navelPressHeld: number | null = null;
  /**
   * Under a shirt her navel is not softened at all (`clothShirtOver`): the shirt follows her navel as closely as NAVEL
   * DETAIL says, her navel as it is; only a probe presses it (`navelClothPress`). (Not the fitted tee's own
   * navel: its shapes follow hers, and settled to an ordinary navel it would dip where hers does; that one is settled
   * onto its smooth surface instead, in the shader.)
   */
  let clothFlattenLaid = 0;
  function clothFlatten(): number {
    clothFlattenLaid = clothFlattenWanted();
    return clothFlattenLaid;
  }
  /**
   * The softening her navel is wanted at under what she wears: nothing (Joshua, 2026-11-06: "The shape can alter, but,
   * only based on the slider through clothes, it doesn't affect the main bellybutton shape" -- NAVEL DETAIL decides how
   * closely the shirt follows her navel, navelSurface.ts, and her navel stays as it is), unless a probe presses it.
   */
  function clothFlattenWanted(): number {
    return clothShirtOver() ? navelPressHeld ?? 0 : 0;
  }
  /**
   * A shirt over her middle -- the procedural garment, the light tee's cloth copy, or the fitted light tee -- whose NAVEL
   * DETAIL decides how closely the shirt follows her navel (navelSurface.ts) and never her navel itself.
   */
  function clothShirtOver(): boolean { return !!garmentRoom || clothWorn() || !!fittedTee(); }
  /** The fitted light tee, when it is what she wears over her middle (the cloth off), or null. */
  function fittedTee(): THREE.SkinnedMesh | null {
    if (clothWorn()) return null;
    const tee = partMeshes.get('spandex-lite')?.[0];
    return tee && recovered && shownNow('shirtSpandexLite') ? tee : null;
  }
  function dress(next: number, opening = false): void {
    // chosen before she is in: the opening dresses her in it
    if (!loaded && !opening) { outfit = next; refresh(); return; }
    const parts = recovered ? recoveredPartsFor(wornGarments(next, garments)) : [];
    const missing = parts.filter(p => !partMeshes.has(p));
    // a shirt download for an outfit no longer wanted is cancelled: 66-77 MB a phone should not finish for nothing
    for (const [p, run] of [...inflight]) if (isShirtPart(p) && !parts.includes(p)) { run.abort.abort(); inflight.delete(p); }
    const request = ++outfitRequest;
    if (!missing.length) {
      wantedOutfit = null; outfit = next; fabric?.refreshTargets(); wearPaint();
      if (model) model.visible = true;
      applyLook(); applyMotion(); refresh();
      if (opening) settle(); else if (meter.snapshot().phase !== 'idle') meter.ready();
      return;
    }
    wantedOutfit = opening ? null : next;
    if (!opening) begin(`Loading ${outfitName(next)}`, model?.visible ? 'aside' : 'centre');
    for (const p of missing) meter.expect(recoveredPartPath(p), assets.assetBytes(recoveredPartPath(p)));
    refresh();
    const expectedModel = model;
    void Promise.all(missing.map(p => requestPart(p))).then(scenes => {
      const stale = disposed || model !== expectedModel || request !== outfitRequest;
      const broken = scenes.some(x => x.userData.isPlaceholder);
      // the small files are worth keeping whatever happened; a shirt is kept only by the outfit it was fetched for
      const sameBody = !disposed && model === expectedModel;
      missing.forEach((p, i) => { if (sameBody && (isShirtPart(p) ? !stale && !broken : true)) wearPart(p, scenes[i]); else release(scenes[i]); });
      if (stale) return;
      if (broken) { failLoad(opening ? 'her outfit' : `the ${outfitName(next)} outfit`, () => again(next, opening)); refresh(); return; }
      wantedOutfit = null; outfit = next; fabric?.refreshTargets(); wearPaint();
      if (model) model.visible = true;
      applyLook(); applyMotion(); refresh(); settle();
      // the light tee as cloth, as she is meant to wear it
      wantCloth();
    }).catch(error => {
      if ((error as Error)?.name === 'AbortError' || request !== outfitRequest) return;
      console.error('[sarahlab] outfit preparation failed', error);
      failLoad('her outfit', () => again(next, opening)); refresh();
    });
  }
  /** Retry an outfit: a fresh count, then dress again (what did arrive is on her already and is not fetched twice). */
  function again(next: number, opening: boolean): void {
    if (opening) begin(OPENING_LABEL, 'centre');
    dress(next, opening);
  }

  function buildHud(): void {
    const root = document.createElement('div');
    root.dataset.role = SARAH_LAB_HUD_ROLE;
    // THE STUDIO (Joshua, 2026-10-23: "Use the new UI look, but let's keep both themes like a dark/light color"): the
    // controls are built here as they always were, each marked with the section it belongs to (`data-tab`), and
    // studioLayout.ts sorts them into the inspector, rail and stage at the end of this function
    root.style.cssText = 'position:absolute;inset:0;font:600 13px system-ui,sans-serif;color:var(--sl-ink,#e8e2d8);touch-action:none;user-select:none;-webkit-user-select:none';
    // (any touch wakes the sound of her steps, as a phone requires before it plays anything: footsteps.ts)
    root.addEventListener('pointerdown', () => { if (sneakersOn) tileSteps.unlock(); }, { capture: true });
    // the orbit: the whole screen under the controls
    root.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('button,input,select,summary')) return;
      root.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      // painting her skin's map (FACE · PAINT SKIN): one finger is the brush, a second takes over as turn and zoom
      if (paintingSkin()) { if (pointers.size === 1) skinStroke(e.clientX, e.clientY, true); else endSkinStroke(); }
      // painting her body: one finger is the brush, a second takes over as turn and zoom
      else if (fabric?.tool()) { if (pointers.size === 1) fabric.strokeStart(e.clientX, e.clientY); else fabric.strokeEnd(); }
      // building: one finger places and moves the points, a second takes over as turn and zoom, the same way
      else if (building()) { if (pointers.size === 1) builder!.pointerDown(e.clientX, e.clientY); else builder!.pointerUp(); }
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    });
    root.addEventListener('pointermove', (e) => {
      const was = pointers.get(e.pointerId);
      if (!was) return;
      const now = { x: e.clientX, y: e.clientY };
      pointers.set(e.pointerId, now);
      if (pointers.size === 1 && skinPainting) { skinStroke(now.x, now.y, false); return; }
      if (pointers.size === 1 && fabric?.tool()) { fabric.strokeMove(now.x, now.y); return; }
      if (pointers.size === 1 && building()) { builder!.pointerMove(now.x, now.y); return; }
      if (pointers.size === 1) {
        orbit.yaw -= (now.x - was.x) * 0.008;
        orbit.pitch = Math.min(1.2, Math.max(-0.35, orbit.pitch + (now.y - was.y) * 0.006));
        turning = false;
        refresh();
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0) zoom(pinch / Math.max(1, d));
        pinch = d;
        // two fingers moved together pan her up and down (Joshua, 2026-10-29: "place down two fingers on mobile to be
        // able to pan the camera up and down as it's hard to see the model, paint, or whatever on mobile"): the point
        // between them moves half as far as the finger that moved, and she follows it -- pinch and pan at once
        panBy((now.y - was.y) / 2, root.getBoundingClientRect().height);
      }
    });
    const up = (e: PointerEvent) => { pointers.delete(e.pointerId); pinch = 0; endSkinStroke(); fabric?.strokeEnd(); builder?.pointerUp(); };
    root.addEventListener('pointerup', up);
    root.addEventListener('pointercancel', up);
    root.addEventListener('wheel', (e) => { e.preventDefault(); zoom(Math.exp(e.deltaY * 0.001)); }, { passive: false });

    const btn = (label: string, action: string, onClick: () => void) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.dataset.action = action;
      b.type = 'button';
      b.style.cssText = 'padding:9px 12px;border-radius:10px;border:1px solid var(--sl-btn-line,#ffffff30);background:var(--sl-btn,#151b23);color:var(--sl-ink,#e8e2d8);font:700 12px system-ui,sans-serif;letter-spacing:.05em;cursor:pointer';
      b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); refresh(); });
      return b;
    };
    const back = btn('‹ BACK', SARAH_LAB_ACTION.back, () => hooks.onBack());

    const poses = document.createElement('div');
    poses.className = 'slab-poses';
    poses.dataset.tab = 'pose';
    poses.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:6px';
    for (const [p, label, action] of [['stand', 'STAND', SARAH_LAB_ACTION.stand], ['walk', 'WALK', SARAH_LAB_ACTION.walk], ['sit', 'SIT', SARAH_LAB_ACTION.sit], ['tpose', 'T-POSE', SARAH_LAB_ACTION.tpose], ['apart', 'LEGS APART', SARAH_LAB_ACTION.apart], ['squat', 'SQUAT', SARAH_LAB_ACTION.squat], ['recline', 'RECLINE', SARAH_LAB_ACTION.recline]] as const) {
      buttons[p] = btn(label, action, () => {
        // STAND to SIT and back is a move over SIT_SECONDS, the cloth on her all the way; any other switch is at once
        sitMoving = (p === 'sit' || p === 'stand') && (pose === 'sit' || pose === 'stand' || sitMoving) && p !== pose;
        if (!sitMoving) sitAmount = p === 'sit' ? 1 : 0;
        pose = p;
        // a pose switch moves her at once: the cloth starts again from her body rather than being flung
        if (!sitMoving) clothRestart = true;
        if (p === 'tpose' && !levelArmsModel(SARAH_LAB_MODELS[modelIndex].id)) { armsDeg = 90; armsOverride = true; }
        applyLook(); refresh();
      });
      buttons[p].style.padding = '9px 2px'; buttons[p].style.minWidth = '0';
      poses.appendChild(buttons[p]);
    }
    root.appendChild(poses);

    const right = document.createElement('div');
    // every control is built into this, marked with its section, and moved to that section when the studio is laid out
    right.className = 'slab-panel';
    const slider = (field: string, value: number, onInput: (v: number) => void, max = 100, tab = 'body', min = 0) => {
      const label = document.createElement('div');
      label.dataset.tab = tab;
      label.dataset.field = field;
      label.style.cssText = 'font-size:12px;letter-spacing:.05em';
      fields[field] = label;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(min);
      input.max = String(max);
      input.value = String(value);
      input.style.cssText = 'width:100%;accent-color:var(--sl-accent,#d4a853);height:28px';
      input.dataset.tab = tab;
      input.addEventListener('input', () => { onInput(Number(input.value)); applyLook(); refresh(); });
      right.append(label, input);
      return input;
    };
    bumpInput = slider(SARAH_LAB_FIELD.bump, bump, (v) => { bump = v; }, BUMP_MAX_PERCENT);
    {
      // QUICK SIZES (from the Character Studio preview): the five sizes the belly is keyed at, one tap each
      const sizes = document.createElement('div'); sizes.dataset.tab = 'body';
      sizes.style.cssText = 'display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-top:-2px';
      for (const v of QUICK_SIZES) {
        const b = btn(`${v}%`, `${SARAH_LAB_ACTION.quickSize}${v}`, () => { bump = v; applyLook(); applyMotion(); });
        b.style.padding = '5px 0'; b.style.fontSize = '11px';
        buttons[`size${v}`] = b; sizes.appendChild(b);
      }
      right.appendChild(sizes);
    }
    {
      // the bump's own lock and random range (it is in the BELLY group)
      const spec = BODY_RANDOM_SPECS.find((x) => x.key === 'bump')!;
      const r = document.createElement('div'); r.dataset.tab = 'body';
      r.style.cssText = 'display:flex;justify-content:flex-end;gap:4px;margin-top:-4px';
      r.append(lockButton(spec));
      right.append(r, rangeRow(spec));
    }
    {
      // HER WEEKS (Joshua, 2026-11-05: "add a text box you can type in the exact week to the % if you have an exact week
      // for that %. Also, you could add the 1st week of pregnancy %, and the delivery week %... then the game can use those
      // numbers later"). Each box is blank until something is typed, and shows in grey what is in force meanwhile; blank
      // again, or its ↺, is nothing typed. Together they are her chart (baby.ts `herChart`), kept with her body.
      const wrap = document.createElement('div'); wrap.dataset.tab = 'body';
      wrap.style.cssText = 'display:grid;grid-template-columns:1fr auto auto auto;align-items:center;gap:3px 5px;font-size:11px;letter-spacing:.04em;margin:2px 0 4px;border-top:1px solid rgba(255,255,255,0.12);padding-top:6px';
      const head = document.createElement('div');
      head.style.cssText = 'grid-column:1 / -1;font:700 11px system-ui,sans-serif;letter-spacing:.08em';
      const sub = document.createElement('span'); sub.textContent = ' · type what you know; blank is the chart\'s';
      sub.style.cssText = 'font-weight:500;letter-spacing:.03em;opacity:.7';
      head.append('HER WEEKS', sub);
      wrap.appendChild(head);
      const box = (field: string, range: readonly [number, number], step: number, set: (v: number | null) => void): HTMLInputElement => {
        const i = document.createElement('input');
        i.type = 'number'; i.inputMode = 'decimal'; i.min = String(range[0]); i.max = String(range[1]); i.step = String(step);
        i.dataset.field = field;
        i.style.cssText = 'width:54px;height:24px;border-radius:6px;border:1px solid #ffffff30;background:#0d1117;color:#e8e2d8;font:600 12px system-ui;padding:0 4px';
        // (applied when the box is left or Enter pressed, not at each key: typing 32 is never a 3 first)
        i.addEventListener('change', () => { const v = typedNumber(i.value, range); if (v === undefined) refresh(); else set(v); });
        i.addEventListener('keydown', (e) => e.stopPropagation());
        weekBoxes.set(field, i);
        return i;
      };
      // (one row each: its name, its box, its unit, its ↺)
      const row = (label: string | HTMLElement, input: HTMLInputElement, unit: string, clear: () => void, action: string) => {
        const l = typeof label === 'string' ? Object.assign(document.createElement('span'), { textContent: label }) : label;
        const reset = btn('↺', action, clear);
        reset.title = 'nothing typed: the chart\'s'; reset.style.padding = '2px 8px'; reset.style.fontSize = '12px';
        buttons[action] = reset;
        wrap.append(l, input, Object.assign(document.createElement('span'), { textContent: unit }), reset);
      };
      weekLabel = document.createElement('span');
      row(weekLabel, box(SARAH_LAB_FIELD.pregnancyWeek, PREGNANCY_RANGE.week, 0.1, (v) => setPregnancy(typeWeek(pregnancy, v, bump))), 'wk', () => setPregnancy(typeWeek(pregnancy, null, bump)), `${SARAH_LAB_ACTION.pregnancyClear}week`);
      row('WEEK 1 BELLY', box(SARAH_LAB_FIELD.pregnancyFirst, PREGNANCY_RANGE.bump, 1, (v) => setPregnancy({ ...pregnancy, firstWeekBump: v })), '%', () => setPregnancy({ ...pregnancy, firstWeekBump: null }), `${SARAH_LAB_ACTION.pregnancyClear}first`);
      row('DELIVERY BELLY', box(SARAH_LAB_FIELD.pregnancyDelivery, PREGNANCY_RANGE.bump, 1, (v) => setPregnancy({ ...pregnancy, deliveryBump: v })), '%', () => setPregnancy({ ...pregnancy, deliveryBump: null }), `${SARAH_LAB_ACTION.pregnancyClear}delivery`);
      row('DELIVERY WEEK', box(SARAH_LAB_FIELD.pregnancyDeliveryWeek, PREGNANCY_RANGE.deliveryWeek, 0.1, (v) => setPregnancy({ ...pregnancy, deliveryWeek: v })), 'wk', () => setPregnancy({ ...pregnancy, deliveryWeek: null }), `${SARAH_LAB_ACTION.pregnancyClear}deliveryWeek`);
      const line = document.createElement('div');
      line.dataset.field = SARAH_LAB_FIELD.pregnancyLine; fields[SARAH_LAB_FIELD.pregnancyLine] = line;
      line.style.cssText = 'grid-column:1 / -1;font-size:10px;opacity:.8;line-height:1.35';
      wrap.appendChild(line);
      right.appendChild(wrap);
    }
    slider(SARAH_LAB_FIELD.fingers, curl, (v) => { curl = v; }, 100, 'pose');
    armsInput = slider(SARAH_LAB_FIELD.arms, armsDeg, (v) => { armsDeg = v; armsOverride = true; }, 90, 'pose');
    // THE SLOPE (walkStrip.ts): the treadmill tilted under STAND and WALK, -30 to +30, ahead of her or across her path
    slopeInput = slider(SARAH_LAB_FIELD.slope, slope.deg, (v) => setSlope(v, slope.heading), SLOPE.most, 'pose', -SLOPE.most);
    { const row = document.createElement('div'); row.dataset.tab = 'pose'; row.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
      for (const h of SLOPE.headings) { const b = btn(h === 'ahead' ? 'AHEAD' : 'ACROSS', SARAH_LAB_ACTION.slope + h, () => setSlope(slope.deg, h)); buttons[SARAH_LAB_ACTION.slope + h] = b; row.append(b); }
      // BALANCE TEST (developer): her centre of mass and what holds it up, drawn
      const balance = btn('BALANCE TEST', SARAH_LAB_ACTION.balance, () => setBalance(!balanceOn)); buttons[SARAH_LAB_ACTION.balance] = balance; row.append(balance);
      right.appendChild(row);
      const line = document.createElement('div'); line.dataset.tab = 'pose'; line.dataset.field = SARAH_LAB_FIELD.balance; line.style.cssText = 'font-size:12px;letter-spacing:.05em'; fields[SARAH_LAB_FIELD.balance] = line; right.appendChild(line); }
    // her birth opening, closed to the full 10 cm (with the birth poses: LEGS APART, SQUAT, RECLINE)
    birthOpenInput = slider(SARAH_LAB_FIELD.birthOpen, birthOpenPct, (v) => { birthOpenPct = v; vulva?.setOpen(v / 100); organs?.setOpening(v / 100); }, 100, 'pose');
    // and how far the area round it is pushed out, on its own (in a birth it opens first, and bulges once her baby's head
    // is low in the canal)
    birthBulgeInput = slider(SARAH_LAB_FIELD.birthBulge, birthBulgePct, (v) => { birthBulgePct = v; vulva?.setBulge(v / 100); }, 100, 'pose');
    // FOLD BACK (v3, on her skeleton): her opening's doors folded back by hand, piece by piece, then on their hinges
    foldBackInput = slider(SARAH_LAB_FIELD.foldBack, foldBackPct, (v) => { foldBackPct = v; organs?.setFold(v / 100); }, 100, 'pose');
    // X-RAY (v3, on her skeleton): her bones see-through, her organs and baby solid inside them
    xrayInput = slider(SARAH_LAB_FIELD.xray, xrayPct, (v) => { xrayPct = v; if (v > 0) { skeletonV2Lay?.(); layOrgansV2(); } applyXray(); }, 100, 'pose');
    // HER BELLY'S ORGANS: how much her stomach, rectum and bladder hold (actor/gut.ts), and what that means to her
    stomachInput = slider(SARAH_LAB_FIELD.stomach, Math.round(gut.stomachFoodMl + gut.stomachWaterMl), (v) => { const all = gut.stomachFoodMl + gut.stomachWaterMl, food = all > 0 ? gut.stomachFoodMl / all : 0.6; setGut({ ...gut, stomachFoodMl: v * food, stomachWaterMl: v * (1 - food) }); }, STOMACH.mostMl, 'pose');
    bowelInput = slider(SARAH_LAB_FIELD.bowel, Math.round(gut.rectumMl), (v) => setGut({ ...gut, rectumMl: v }), RECTUM.mostMl, 'pose');
    bladderInput = slider(SARAH_LAB_FIELD.bladder, Math.round(gut.bladderMl), (v) => setGut({ ...gut, bladderMl: Math.max(5, v) }), BLADDER.mostMl, 'pose');
    { const line = document.createElement('div'); line.dataset.tab = 'pose'; line.dataset.field = SARAH_LAB_FIELD.gutLine; line.style.cssText = 'font-size:12px;letter-spacing:.05em;opacity:.8'; fields[SARAH_LAB_FIELD.gutLine] = line; right.appendChild(line); }
    // HER BABY'S BIRTH: begin, pause, FAST or REALISTIC, and back to the start (birthSequence.ts)
    { const line = document.createElement('div'); line.dataset.tab = 'pose'; line.dataset.field = SARAH_LAB_FIELD.birthLine; line.style.cssText = 'font-size:12px;letter-spacing:.05em'; line.textContent = birthLine(null); fields[SARAH_LAB_FIELD.birthLine] = line; right.appendChild(line);
      const row = document.createElement('div'); row.dataset.tab = 'pose'; row.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
      const run = btn('BIRTH ▶', SARAH_LAB_ACTION.birth + 'run', () => { birthControl('run'); run.textContent = birthRunning ? 'BIRTH ❚❚' : 'BIRTH ▶'; });
      const pace = btn('FAST', SARAH_LAB_ACTION.birth + 'pace', () => { birthControl('pace'); pace.textContent = birthPace === 'fast' ? 'FAST' : 'REALISTIC'; });
      const reset = btn('RESET', SARAH_LAB_ACTION.birth + 'reset', () => { birthControl('reset'); run.textContent = 'BIRTH ▶'; });
      // CUT CORD (its cord is cut on its own a while after it is on her; this cuts it sooner)
      const cut = btn('CUT CORD', SARAH_LAB_ACTION.birth + 'cut', () => { if (!cutCord()) { const f = fields[SARAH_LAB_FIELD.birthLine]; if (f) f.textContent = 'CUT CORD · once it is born'; } });
      // DELIVER PLACENTA (it comes on its own a while after the cut; this brings it sooner)
      const deliver = btn('DELIVER PLACENTA', SARAH_LAB_ACTION.birth + 'placenta', () => { if (!deliverPlacenta()) { const f = fields[SARAH_LAB_FIELD.birthLine]; if (f) f.textContent = 'DELIVER PLACENTA · once the cord is cut'; } });
      // HANDS: once her baby lies on her, her hands come to it (P2), or stay on her knees
      // HOLD: once her baby lies on her, her hands come to it (P2, position A), or she takes it into her arms (position
      // B), or her hands stay on her knees
      const holdLine = () => `HOLD · ${babyHold === 'hands' ? (babyCount > 1 ? 'HANDS ON BABIES' : 'HANDS ON BABY') : babyHold === 'cradle' ? 'IN HER ARMS' : 'HANDS ON KNEES'}`;
      const hands = btn(holdLine(), SARAH_LAB_ACTION.birth + 'hands', () => { babyHold = babyHold === 'hands' ? 'cradle' : babyHold === 'cradle' ? 'knees' : 'hands'; hands.textContent = holdLine(); });
      row.append(run, pace, reset, cut, deliver, hands); right.appendChild(row);
      birthButtons = [run, pace, reset, cut, deliver, hands];
      // its TIMELINE: drag to any moment of it (it pauses there; BIRTH ▶ carries on from it)
      birthTimeInput = slider(SARAH_LAB_FIELD.birthTime, 0, (v) => {
        if (!BIRTH_POSES_OK.includes(pose)) return;
        birthClock = (v / 1000) * birthLength(birthPace, babyCount); birthRunning = false; run.textContent = 'BIRTH ▶'; trimBirthEvents();
      }, 1000, 'pose');
      { const f = fields[SARAH_LAB_FIELD.birthTime]; if (f) f.textContent = 'TIMELINE · drag to any moment'; } }
    // a painted shirt's length, for every painted shirt she puts on (its drape follows: tunicDrape.ts)
    shirtLengthInput = slider(SARAH_LAB_FIELD.shirtLength, Math.round(DEFAULT_SHIRT_LENGTH * 100), (v) => { fabric?.setShirtLength(v / 100); }, Math.round(PAINTED_SHIRT_LONGEST * 100), 'outfit');
    // (no length left to choose, the line stays and says where painted shirts end; the slider goes -- one that cannot
    // move must not look as if it could)
    if (PAINTED_SHIRT_LONGEST <= 0) { shirtLengthInput.remove(); shirtLengthInput = null; }
    // THE CLOTH EXPERIMENT: the light tee as cloth, and its length to mid-thigh (Joshua, 2026-10-23)
    buttons.cloth = btn('CLOTH SIM · ON', SARAH_LAB_ACTION.cloth, () => { clothWanted = !clothOn; void toggleCloth(); });
    buttons.cloth.dataset.tab = 'outfit';
    right.appendChild(buttons.cloth);
    teeLengthInput = slider(SARAH_LAB_FIELD.teeLength, Math.round(CLOTH_TEE_LENGTH_DEFAULT * 100), (v) => { teeLength = v / 100; applyTeeLength(); }, 100, 'outfit');
    // ...and its sleeves, as made or a tank's armholes (Joshua, 2026-10-25: TEE LENGTH 0 a cropped tank athletic top, and
    // a SLEEVES switch for tank or cap sleeve at any length)
    buttons.sleeves = btn(sleevesLine(sleeves, clothOn), SARAH_LAB_ACTION.sleeves, () => { sleeves = !sleeves; cloth?.setSleeves(sleeves); refresh(); });
    buttons.sleeves.dataset.tab = 'outfit'; buttons.sleeves.style.padding = '7px 10px'; buttons.sleeves.style.fontSize = '11px';
    right.appendChild(buttons.sleeves);
    // ...and its neckline, up to a turtleneck or down in a U or a V (Joshua, 2026-10-24: "can the neckline also be adjustable
    // like the length so you can do U/V shape and select how deep up to turtleneck?")
    necklineInput = slider(SARAH_LAB_FIELD.neckline, CLOTH_NECKLINE_DEFAULT, (v) => { neckline = v; cloth?.setNeckline(neckline / 100, neckShape); }, 100, 'outfit', -100);
    buttons.neckShape = btn(neckShapeLine(neckShape, neckline), SARAH_LAB_ACTION.neckShape, () => { neckShape = neckShape === 'U' ? 'V' : 'U'; cloth?.setNeckline(neckline / 100, neckShape); refresh(); });
    buttons.neckShape.dataset.tab = 'outfit'; buttons.neckShape.style.padding = '7px 10px'; buttons.neckShape.style.fontSize = '11px';
    right.appendChild(buttons.neckShape);
    // THE NEW TEE'S CONTROLS (Stage 3): shown while an outfit's tee is the new one (`refresh`); every change comes back
    // through `garmentChanged`
    garmentPanel = new GarmentPanel({
      settings: () => garmentSettings,
      change: (next, final) => garmentChanged(next, final),
      stops: () => (garmentRoom && garmentAuto ? garmentRoom.stops() : null),
      tailoring: () => garmentTailoring,
    });
    right.appendChild(garmentPanel.element);
    // ...and its dials, live (Joshua, 2026-10-24: "Could potentially even add sliders to play with values in real time")
    for (const d of CLOTH_DIALS) clothDialInputs.set(d.key, slider(`${SARAH_LAB_FIELD.clothDial}${d.key}`, clothTune[d.key], (v) => { clothTune = { ...clothTune, [d.key]: v }; tuneCloth(); }, 100, 'outfit'));
    {
      const r = document.createElement('div'); r.dataset.tab = 'outfit'; r.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
      // (on the new tee as on the cloth tee: laid again where it settled)
      buttons.clothReset = btn('LAY CLOTH AGAIN', SARAH_LAB_ACTION.clothReset, () => { clothRestart = true; garmentRoom?.cloth.restart(); });
      buttons.clothDefaults = btn('CLOTH DEFAULTS', SARAH_LAB_ACTION.clothDefaults, () => { clothTune = CLOTH_TUNE_DEFAULT; for (const [k, i] of clothDialInputs) i.value = String(clothTune[k as keyof ClothTune]); tuneCloth(); clothRestart = true; garmentRoom?.cloth.restart(); });
      // her sneakers (sneakers.ts), on and off; and the sound of her steps in them (footsteps.ts)
      buttons.sneakers = btn(`SNEAKERS · ${sneakersOn ? 'ON' : 'OFF'}`, SARAH_LAB_ACTION.sneakers, () => setSneakers(!sneakersOn));
      buttons.stepSound = btn('STEP SOUND · ON', SARAH_LAB_ACTION.stepSound, () => {
        tileSteps.on = !tileSteps.on; tileSteps.unlock();
        buttons.stepSound.textContent = `STEP SOUND · ${tileSteps.on ? 'ON' : 'OFF'}`;
      });
      for (const b of [buttons.clothReset, buttons.clothDefaults]) { b.style.padding = '7px 10px'; b.style.fontSize = '11px'; r.appendChild(b); }
      right.appendChild(r);
      // her shoes: shown whatever she is wearing over them
      const shoes = document.createElement('div'); shoes.dataset.tab = 'outfit'; shoes.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
      for (const b of [buttons.sneakers, buttons.stepSound]) { b.style.padding = '7px 10px'; b.style.fontSize = '11px'; shoes.appendChild(b); }
      right.appendChild(shoes);
    }
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
    buttons.outfit = btn(outfitLine(outfit), SARAH_LAB_ACTION.outfit, () => { wornFrom = null; pendingClothes = null; nextSource = null; dress(nextOutfit(wantedOutfit ?? outfit, garments)); });
    buttons.model = btn(modelLine(modelIndex), SARAH_LAB_ACTION.model, () => {
      modelIndex = nextModel(modelIndex, new URLSearchParams(globalThis.location?.search ?? '').get('probe') === 'cloth');
      armsDeg = levelArmsModel(SARAH_LAB_MODELS[modelIndex].id) || pose === 'tpose' ? 90 : 0;
      armsOverride = pose === 'tpose';
      loadSarah();
    });
    buttons.refine = btn(refineLine(refine), SARAH_LAB_ACTION.refine, () => { refine = !refine; applyLook(); refresh(); });
    // the belly curve experiment (Joshua, 2026-10-22): CURRENT is the approved slider; the others are for comparing
    const curveLabel = () => `BELLY CURVE · ${BELLY_CURVE_NAMES[bellyCurve]}${bellyCurve === DEFAULT_BELLY_CURVE ? '' : bellyCurve === 'approved' ? ' (backup)' : ' (experiment)'}`;
    buttons.bellyCurve = btn(curveLabel(), SARAH_LAB_ACTION.bellyCurve, () => {
      bellyCurve = BELLY_CURVES[(BELLY_CURVES.indexOf(bellyCurve) + 1) % BELLY_CURVES.length];
      buttons.bellyCurve.textContent = curveLabel();
      applyLook(); applyMotion(); refresh();
    });
    buttons.armSide = btn('ARMS · both', SARAH_LAB_ACTION.armSide, () => { armSide = (armSide + 1) % ARM_SIDES.length; applyLook(); refresh(); });
    buttons.turn = btn('TURN', SARAH_LAB_ACTION.turn, () => { turning = !turning; });
    // a nudge up, as a hop would: the bump lags, drops and settles
    buttons.bounce = btn('BOUNCE', SARAH_LAB_ACTION.bounce, () => { masses.belly.vy -= 0.3; masses.breastL.vy -= 0.3; masses.breastR.vy -= 0.3; });
    // PREGNANT (P5): on or off and nothing else -- her weeks are what is typed (HER WEEKS, under her belly's size)
    buttons.pregnant = btn(pregnantLine(pregnancy), SARAH_LAB_ACTION.pregnant, () => {
      setPregnancy({ ...pregnancy, pregnant: !pregnancy.pregnant });
    });
    buttons.baby = btn('SEE BABY', SARAH_LAB_ACTION.baby, () => { showBaby(!babyShown); refresh(); });
    // OPENING: her skeleton's doors at her opening, or v2's own as it was (until Joshua approves the new one)
    buttons.opening = btn(openingLine(skeletonOpening), SARAH_LAB_ACTION.opening, () => { skeletonOpening = !skeletonOpening; if (skeletonOpening) layOrgansV2(false); applyOpening(); applyLook(); });
    buttons.babies = btn('BABIES · ONE', SARAH_LAB_ACTION.babies, () => { if (birthClock !== null) birthControl('reset'); babyCount = (babyCount % 3) + 1; babyDirty = true; babyFitAt = -Infinity; applyLook(); refresh(); });
    buttons.babyLie = btn('LIE · AUTO', SARAH_LAB_ACTION.babyLie, () => { babyLie = LIE_MODES[(LIE_MODES.indexOf(babyLie) + 1) % LIE_MODES.length]; if (babyLie === 'random') babyLieSeed = Math.floor(Math.random() * 1e6) + 1; babyDirty = true; babyFitAt = -Infinity; refresh(); });
    // KICK: one of them kicks now (as BABY KICKS makes them on their own)
    buttons.babyKick = btn('KICK', SARAH_LAB_ACTION.babyKick, () => { const roots = babyRoots(); if (!roots.length) return; const i = Math.floor(Math.random() * roots.length); startMove(babyMoveOf(i, roots[i]), 'kick'); });
    for (const b of [buttons.model, buttons.refine, buttons.bellyCurve, buttons.outfit, buttons.armSide, buttons.bounce, buttons.pregnant, buttons.baby, buttons.babies, buttons.babyLie, buttons.babyKick]) { b.style.padding = '8px 10px'; b.style.fontSize = '12px'; row.appendChild(b); }
    for (const [b, tab] of [[buttons.model, 'body'], [buttons.refine, 'body'], [buttons.bellyCurve, 'body'], [buttons.outfit, 'outfit'], [buttons.armSide, 'pose'], [buttons.bounce, 'pose'], [buttons.pregnant, 'body'], [buttons.baby, 'body'], [buttons.babies, 'body'], [buttons.babyLie, 'body'], [buttons.babyKick, 'body']] as const) b.dataset.tab = tab;
    right.appendChild(row);
    // the baby's week, length and weight, while it is shown
    babyNote = document.createElement('div');
    babyNote.dataset.tab = 'body'; babyNote.dataset.field = SARAH_LAB_FIELD.baby;
    babyNote.style.cssText = 'font:600 11px system-ui,sans-serif;letter-spacing:.04em;opacity:.85;margin:2px 0 4px';
    right.appendChild(babyNote);
    // BELLY SHAPE and BREAST SHAPE: each control a slider with its own reset, relative to the size shown
    const setBody = (next: BodyShape) => { body = next; applyLook(); applyMotion(); refresh(); };
    // RANDOMIZE (Joshua, 2026-10-22): every unlocked control picked within its own range; a lock (🔒) on a control or
    // its group keeps it exactly as set. RANGES shows each control's range to change it
    function lockButton(spec: RandomSpec): HTMLButtonElement {
      const b = btn('🔓', `${SARAH_LAB_ACTION.randomLock}${spec.key}`, () => { randomRules = withRule(randomRules, spec, { locked: !ruleFor(randomRules, spec).locked }); refresh(); });
      b.title = 'lock: RANDOMIZE keeps this value'; b.style.padding = '2px 6px'; b.style.fontSize = '12px';
      lockButtons.set(spec.key, b);
      return b;
    }
    function rangeRow(spec: RandomSpec): HTMLElement {
      const row = document.createElement('div');
      row.dataset.tab = 'body';
      row.style.cssText = 'display:none;align-items:center;gap:4px;font-size:10px;opacity:.85;margin:2px 0 4px';
      const box = (value: number, which: 'min' | 'max') => {
        const i = document.createElement('input');
        i.type = 'number'; i.min = String(spec.min); i.max = String(spec.max); i.step = String(spec.step); i.value = String(value);
        i.dataset.field = `${SARAH_LAB_FIELD.randomRange}${spec.key}-${which}`;
        i.style.cssText = 'width:62px;height:24px;border-radius:6px;border:1px solid #ffffff30;background:#0d1117;color:#e8e2d8;font:600 11px system-ui;padding:0 4px';
        i.addEventListener('change', () => { if (Number.isFinite(Number(i.value))) randomRules = withRule(randomRules, spec, { [which]: Number(i.value) }); refresh(); });
        i.addEventListener('keydown', (e) => e.stopPropagation());
        return i;
      };
      const r = ruleFor(randomRules, spec), lo = box(r.min, 'min'), hi = box(r.max, 'max');
      const label = document.createElement('span'); label.textContent = 'random';
      const dash = document.createElement('span'); dash.textContent = 'to';
      row.append(label, lo, dash, hi);
      rangeRows.push({ spec, row, lo, hi });
      return row;
    }
    {
      const row = document.createElement('div');
      row.dataset.tab = 'body';
      row.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,0.12);padding-top:6px';
      buttons.randomize = btn('RANDOMIZE', SARAH_LAB_ACTION.randomize, () => {
        const next = randomize({ bump, ...body }, BODY_RANDOM_SPECS, randomRules);
        bump = Math.round(next.bump);
        body = clampShape(Object.fromEntries(BODY_CONTROLS.map((c) => [c.key, next[c.key]])) as BodyShape);
        applyLook(); applyMotion(); refresh();
      });
      for (const [group, label] of RANDOM_GROUPS) {
        buttons[`groupLock-${group}`] = btn(`${label} 🔓`, `${SARAH_LAB_ACTION.randomGroupLock}${group}`, () => { randomRules = withGroupLock(randomRules, group, !randomRules.groups.includes(group)); refresh(); });
      }
      buttons.ranges = btn('RANGES', SARAH_LAB_ACTION.randomRanges, () => { rangesShown = !rangesShown; refresh(); });
      for (const b of [buttons.randomize, buttons['groupLock-build'], buttons['groupLock-belly'], buttons['groupLock-breasts'], buttons['groupLock-walk'], buttons.ranges]) { b.style.padding = '8px 10px'; b.style.fontSize = '12px'; row.appendChild(b); }
      right.appendChild(row);
    }
    for (const [group, title] of [['build', 'HEIGHT & PROPORTIONS'], ['belly', 'BELLY SHAPE'], ['breasts', 'BREAST SHAPE'], ['walk', 'WALK']] as const) {
      const box = document.createElement('details');
      box.dataset.tab = 'body';
      box.style.cssText = 'border-top:1px solid rgba(255,255,255,0.12);padding-top:6px';
      const head = document.createElement('summary');
      head.textContent = title;
      head.style.cssText = 'cursor:pointer;font:700 12px system-ui,sans-serif;letter-spacing:.08em;padding:4px 0';
      box.appendChild(head);
      if (group === 'belly') {
        const presets = document.createElement('div');
        presets.style.cssText = 'display:flex;gap:6px;margin:4px 0';
        for (const t of SIZE_TILT_PRESETS_DEG) {
          const b = btn(`TILT ${t}°`, `${SARAH_LAB_ACTION.tiltPreset}${t}`, () => setBody(setControl(body, 'bellyTilt', t)));
          b.style.padding = '6px 8px'; b.style.fontSize = '11px';
          buttons[`tilt${t}`] = b; presets.appendChild(b);
        }
        box.appendChild(presets);
      }
      if (group === 'build') {
        // THE FIVE CLASSIC SHAPES (Joshua, 2026-10-26): each sets her shoulders, waist, hips and bust and nothing else
        buildBox = box;
        const presets = document.createElement('div');
        presets.style.cssText = 'display:flex;gap:6px;margin:4px 0;flex-wrap:wrap';
        for (const pr of BUILD_PROFILES) {
          const b = btn(pr.label, `${SARAH_LAB_ACTION.buildProfile}${pr.id}`, () => setBody(withProfile(body, pr.id)));
          b.title = `${pr.help} (sets shoulders, waist, hips and bust size)`;
          b.style.padding = '6px 8px'; b.style.fontSize = '11px';
          buttons[`profile-${pr.id}`] = b; presets.appendChild(b);
        }
        box.appendChild(presets);
      }
      for (const c of BODY_CONTROLS.filter((k) => k.group === group)) {
        const line = document.createElement('div');
        line.style.cssText = 'display:flex;justify-content:space-between;align-items:center;font-size:11px;letter-spacing:.04em;margin-top:4px';
        const label = document.createElement('span');
        label.dataset.field = `${SARAH_LAB_FIELD.body}${c.key}`;
        fields[`${SARAH_LAB_FIELD.body}${c.key}`] = label;
        const reset = btn('↺', `${SARAH_LAB_ACTION.bodyReset}${c.key}`, () => setBody(resetControl(body, c.key)));
        reset.title = `reset ${c.label.toLowerCase()} to the approved value`;
        reset.style.padding = '2px 8px'; reset.style.fontSize = '12px';
        if (BREAST_DIMENSIONS.includes(c.key)) {
          // the lock: linking changes nothing on her; it decides what the next move carries with it
          const link = btn('LINK', `${SARAH_LAB_ACTION.bodyLink}${c.key}`, () => { if (linked.has(c.key)) linked.delete(c.key); else linked.add(c.key); });
          link.title = `move ${c.label.toLowerCase()} together with the other linked dimensions, keeping their proportions`;
          link.style.padding = '2px 6px'; link.style.fontSize = '10px';
          buttons[`link-${c.key}`] = link;
          const pair = document.createElement('span'); pair.style.cssText = 'display:flex;gap:4px';
          pair.append(lockButton(BODY_RANDOM_SPECS.find((x) => x.key === c.key)!), link, reset);
          line.append(label, pair);
        } else {
          const pair = document.createElement('span'); pair.style.cssText = 'display:flex;gap:4px';
          pair.append(lockButton(BODY_RANDOM_SPECS.find((x) => x.key === c.key)!), reset);
          line.append(label, pair);
        }
        const input = document.createElement('input');
        input.type = 'range'; input.min = String(c.min); input.max = String(c.max); input.step = String(c.step); input.value = String(body[c.key]);
        input.style.cssText = 'width:100%;accent-color:#d4a853;height:24px';
        input.addEventListener('input', () => setBody(linked.has(c.key) ? setLinkedControl(body, c.key, Number(input.value), linked) : setControl(body, c.key, Number(input.value))));
        bodyInputs.set(c.key, input);
        box.append(line, input, rangeRow(BODY_RANDOM_SPECS.find((x) => x.key === c.key)!));
      }
      if (group === 'build') {
        const reset = btn('RESET PROPORTIONS', SARAH_LAB_ACTION.buildReset, () => setBody(clampShape({ ...body, ...Object.fromEntries(BODY_CONTROLS.filter((k) => k.group === 'build').map((k) => [k.key, k.fallback])) })));
        reset.style.padding = '6px 8px'; reset.style.fontSize = '11px'; reset.style.marginTop = '6px';
        box.appendChild(reset);
      }
      if (group === 'breasts') {
        const linkAll = btn('LINK W·H·D', SARAH_LAB_ACTION.bodyLinkAll, () => { const all = BREAST_DIMENSIONS.every((k) => linked.has(k)); for (const k of BREAST_DIMENSIONS) if (all) linked.delete(k); else linked.add(k); });
        linkAll.style.padding = '6px 8px'; linkAll.style.fontSize = '11px'; linkAll.style.marginTop = '6px'; linkAll.style.marginRight = '6px';
        buttons.linkAll = linkAll;
        box.appendChild(linkAll);
        const all = btn('RESET ALL SHAPE', SARAH_LAB_ACTION.bodyResetAll, () => setBody(defaultBodyShape()));
        all.style.padding = '6px 8px'; all.style.fontSize = '11px'; all.style.marginTop = '6px';
        box.appendChild(all);
      }
      right.appendChild(box);
    }
    // CHARACTERS & OUTFITS (Joshua, 2026-10-22): save all / body / clothes under a name, the outfit library, the file
    characters = characterPanel({
      read: () => book.read(),
      write: (b) => book.write(b),
      body: (): SavedBody => ({ model: SARAH_LAB_MODELS[modelIndex].id, bump, shape: serializeShape(body), refine, random: randomRules, pregnancy }),
      clothes: () => currentClothes(),
      wornFrom: () => wornFrom,
      putOnBody: (saved) => {
        bump = Math.max(0, Math.min(BUMP_MAX_PERCENT, Math.round(saved.bump)));
        body = parseShape(saved.shape);
        pregnancy = pregnancyOf(saved); babyDirty = true; babyFitAt = -Infinity;
        refine = saved.refine;
        randomRules = saved.random;
        const index = SARAH_LAB_MODELS.findIndex((m) => m.id === saved.model);
        if (index >= 0 && index !== modelIndex) {
          modelIndex = index;
          armsDeg = levelArmsModel(SARAH_LAB_MODELS[modelIndex].id) || pose === 'tpose' ? 90 : 0;
          armsOverride = pose === 'tpose';
          loadSarah();
        } else { applyLook(); applyMotion(); }
        refresh();
      },
      putOnClothes: (saved, from, character) => putOnSaved(saved, from, { kind: 'personal', name: character }),
      thumbnail: () => thumbnail(),
      download: (name, text) => {
        const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      },
    });
    characters.element.dataset.tab = 'library';
    characters.element.dataset.slWhole = '';
    (characters.element as HTMLDetailsElement).open = true;
    // the section's own title says CHARACTERS: the drawer's is not needed there
    characters.element.querySelector('summary')?.style.setProperty('display', 'none');
    right.appendChild(characters.element);
    // BREAST & NAVEL DETAIL through her clothes: the outfit editor's own setting, shown here too (filled in once the
    // editor exists, below), so the BODY tab and BODY PAINT can never disagree (Joshua, 2026-10-22)
    const bodyDetail = document.createElement('details');
    bodyDetail.dataset.tab = 'body';
    bodyDetail.style.cssText = 'border-top:1px solid rgba(255,255,255,0.12);padding-top:6px';
    const bodyDetailHead = document.createElement('summary');
    bodyDetailHead.textContent = 'BREAST & NAVEL DETAIL THROUGH CLOTHES';
    bodyDetailHead.style.cssText = 'cursor:pointer;font:700 12px system-ui,sans-serif;letter-spacing:.08em;padding:4px 0';
    bodyDetail.appendChild(bodyDetailHead);
    right.appendChild(bodyDetail);
    // the outfit editor's SAVE workspace (outfitPanel.ts)
    const clothesNow = currentClothes;
    outfits = outfitPanel({
      read: () => book.read(),
      write: (b) => { book.write(b); characters?.refresh(); },
      clothes: clothesNow,
      body: (): SavedBody => ({ model: SARAH_LAB_MODELS[modelIndex].id, bump, shape: serializeShape(body), refine, random: randomRules, pregnancy }),
      characterName: () => characters?.name() ?? '',
      builtins: () => OUTFITS.filter((o) => (o.paint ? recovered : o.name !== 'none')).map((o) => o.name),
      // her own outfit first, then the rest in the room's order
      wearable: () => offeredOutfits(garments).sort((a, b) => Number(b === SARAH_DEFAULT_OUTFIT) - Number(a === SARAH_DEFAULT_OUTFIT)).map((i) => ({ name: OUTFITS[i].name, thumb: assetUrl(outfitThumbPath(OUTFITS[i].name)) })),
      thumbnail: () => thumbnail(),
      wearBuiltin: (name) => {
        const index = OUTFITS.findIndex((o) => o.name === name);
        if (index < 0) return;
        wornFrom = null; pendingClothes = null; nextSource = null;
        dress(index);
      },
      startBlank: () => {
        // a modelled outfit's garments come off too: a blank outfit is her body, ready for paint
        const name = OUTFITS[outfit].garments.length ? 'none' : OUTFITS[outfit].name;
        putOnSaved({ outfit: name, shirtLength: fabric?.shirtLength() ?? DEFAULT_SHIRT_LENGTH, layers: [], garments: {}, detail: AUTO_DETAIL }, null, { kind: 'new', name: '' });
      },
      putOn: (clothes, source) => putOnSaved(clothes, source.kind === 'shared' ? source.name : null, source),
    });
    const note = document.createElement('div');
    note.dataset.field = SARAH_LAB_FIELD.bodyNote;
    note.dataset.tab = 'body';
    note.style.cssText = 'font-size:10px;opacity:.7';
    fields[SARAH_LAB_FIELD.bodyNote] = note;
    right.appendChild(note);
    texturePanel = garmentTexturePanel(() => skinned, (garment) => {
      const next = OUTFITS.findIndex(look => look.garments.includes(garment));
      if (next >= 0 && next !== outfit) dress(next);
      else { applyLook(); refresh(); }
    });
    texturePanel.element.dataset.tab = 'fabric';
    const scaleOf = new THREE.Vector3();
    fabric = fabricPanel({
      meshes: () => skinned,
      body: () => skinned.find(m => !!m.geometry.getAttribute('_cloth_cover')) ?? null,
      worn: () => wornGarments(outfit, garments).map(g => ({ name: g, label: GARMENT_LABEL[g] ?? g, trim: skinned.some(m => (Array.isArray(m.material) ? m.material : [m.material]).some(x => x.name === `${g}Trim`)) })),
      rest: (mesh) => shaped.find(x => x.mesh === mesh)?.fields ?? null,
      unitsPerCm: (mesh) => { mesh.getWorldScale(scaleOf); return (M / 100) / (scaleOf.x || 1); },
      loadImage: (path) => assets.loadTexture(path).then(t => { const image = (t?.image ?? null) as (CanvasImageSource & { width: number; height: number }) | null; t?.dispose(); return image; }),
      garmentsShown: (which) => { garmentView = which; applyLook(); refresh(); },
      view: () => ({ camera, ...ctx.renderer.size() }),
      describe: () => ({ base: SARAH_LAB_MODELS[modelIndex].id, outfit: OUTFITS[outfit].name }),
      reshape: () => { applyLook(); },
      // saving an outfit lives in the OUTFIT section now: the editor's SAVE space points there
      saveSection: () => {
        const box = document.createElement('div'); box.style.cssText = 'display:flex;flex-direction:column;gap:6px;font-size:11px;line-height:1.4';
        const note = document.createElement('div'); note.textContent = 'Outfits are saved, named and worn in OUTFIT, with a picture of her in each.';
        const go = btn('OPEN OUTFIT', studioSectionAction('outfit'), () => studio?.show('outfit'));
        box.append(note, go);
        return box;
      },
      changed: () => outfits?.changed(),
      // the light tee lies over her nipples and navel, as cloth or as the fitted tee: it counts for AUTO's detail
      clothOver: () => (clothWorn() ? { name: 'shirtSpandexLite', label: 'cloth tee' } : fittedTee() ? { name: 'shirtSpandexLite', label: 'spandex tee' } : null),
      // the middle of her vulva: a vertex of her own skin at its split's middle (her rebuilt area reads its paint there)
      vulvaHint: () => { if (!vulva) return undefined; const b2 = vulva.bake; let best = -1, bd = Infinity; for (let p2 = 0; p2 < b2.count; p2++) if (b2.ring[p2] === 0) { const d2 = Math.abs(b2.flat[p2 * 2 + 1] - b2.split.mid); if (d2 < bd) { bd = d2; best = p2; } } return best >= 0 ? b2.src[best * 3] : undefined; },
      navelHint: () => {
        // her navel: the vertex her own navel morphs move most
        const body = skinned.find(m => !!m.geometry.getAttribute('_cloth_cover'));
        const dict = body?.morphTargetDictionary, targets = body?.geometry.morphAttributes.position;
        if (!body || !dict || !targets) return undefined;
        let best = -1, most = 0;
        for (const name of [...Object.keys(navelWeights(150)), NAVEL_FLAT_TARGET]) {
          const t = dict[name] !== undefined ? targets[dict[name]] : undefined;
          if (!t) continue;
          for (let i = 0; i < t.count; i++) { const m = t.getX(i) ** 2 + t.getY(i) ** 2 + t.getZ(i) ** 2; if (m > most) { most = m; best = i; } }
        }
        return best >= 0 ? best : undefined;
      },
      regions: () => {
        const body = skinned.find(m => !!m.geometry.getAttribute('_cloth_cover'));
        if (!body || !rig || !measure) return null;
        const g = body.geometry, si = g.getAttribute('skinIndex'), sw = g.getAttribute('skinWeight'), n = g.getAttribute('position').count;
        if (!si || !sw) return null;
        const four = (a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => Float32Array.from({ length: n * 4 }, (_, i) => a.getComponent(Math.floor(i / 4), i % 4));
        const fields = shaped.find(x => x.mesh === body)?.fields;
        const three3 = (a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => Float32Array.from({ length: n * 3 }, (_, i) => a.getComponent(Math.floor(i / 3), i % 3));
        // into the skeleton's bind space, where the joints are measured (the bind matrix is identity on her today)
        const position = Float32Array.from(fields?.basePos ?? three3(g.getAttribute('position'))), normal = Float32Array.from(fields?.baseNrm ?? three3(g.getAttribute('normal')));
        const at = new THREE.Vector3(), bindNormal = new THREE.Matrix3().getNormalMatrix(body.bindMatrix);
        for (let i = 0; i < n; i++) {
          at.fromArray(position, i * 3).applyMatrix4(body.bindMatrix).toArray(position, i * 3);
          at.fromArray(normal, i * 3).applyMatrix3(bindNormal).toArray(normal, i * 3);
        }
        const bindRig = rig, jointAt = Object.fromEntries(Object.entries(measure.joints).map(([k, j]) => [k, [bindRig.bind[j].x, bindRig.bind[j].y, bindRig.bind[j].z]])) as Record<keyof typeof measure.joints, [number, number, number]>;
        return mapBody({ skinIndex: four(si), skinWeight: four(sw), parents: rig.bind.map(j => j.parent), joints: measure.joints, restNormal: normal, restPosition: position, jointAt });
      },
    });
    fabric.element.dataset.tab = 'fabric';
    fabric.element.dataset.slWhole = '';
    (fabric.element as HTMLDetailsElement).open = true;
    right.appendChild(fabric.element);
    builder = strapBuilder({
      body: () => skinned.find(m => !!m.geometry.getAttribute('_cloth_cover')) ?? null,
      // her FULL triangle list: the index as loaded, kept before any garment hid skin from the draw
      triangles: (mesh) => (mesh.userData.allIndices as ArrayLike<number> | undefined) ?? mesh.geometry.index?.array ?? [],
      // her approved shape before any slider moved it: where the builder measures, as the paint brush does
      rest: (mesh) => {
        const base = shaped.find(x => x.mesh === mesh)?.fields.basePos;
        const position = mesh.geometry.getAttribute('position');
        return base && base.length === position.count * 3 ? base : Float32Array.from({ length: position.count * 3 }, (_, i) => position.getComponent(Math.floor(i / 3), i % 3));
      },
      unitsPerCm: (mesh) => { mesh.getWorldScale(scaleOf); return (M / 100) / (scaleOf.x || 1); },
      view: () => ({ camera, ...ctx.renderer.size() }),
      loadImage: (path) => assets.loadTexture(path).then(t => { const image = (t?.image ?? null) as (CanvasImageSource & { width: number; height: number }) | null; t?.dispose(); return image; }),
      base: () => SARAH_LAB_MODELS[modelIndex].id,
      changed: () => outfits?.changed(),
      clock: {
        paused: () => clock.paused,
        setPaused: (p) => { clock.paused = p; },
        speed: () => clock.speed,
        setSpeed: (v) => { clock.speed = v; },
        step: () => { clock.paused = true; clock.step += 1 / 30; },
      },
    });
    builder.element.dataset.tab = 'build';
    builder.element.dataset.slWhole = '';
    (builder.element as HTMLDetailsElement).open = true;
    right.appendChild(builder.element);
    bodyDetail.appendChild(fabric.detailControl());
    right.appendChild(texturePanel.element);
    // the outfit cards and saves (outfitPanel.ts): the OUTFIT section's own, not a space inside the fabric editor
    outfits.element.dataset.tab = 'outfit';
    right.appendChild(outfits.element);
    // ------------------------------------------------------------ FACE: her face (faceRig.ts, faceMotion.ts)
    {
      buttons.face = btn('FACE · ON', SARAH_LAB_ACTION.face, () => { faceOn = !faceOn; });
      buttons.eyes = btn(eyesLine(faceMotion.mode), SARAH_LAB_ACTION.eyes, () => { faceMotion.mode = nextEyeMode(faceMotion.mode); });
      buttons.blink = btn('BLINK · ON', SARAH_LAB_ACTION.blink, () => { faceMotion.blinking = !faceMotion.blinking; });
      buttons.talk = btn('TALK · OFF', SARAH_LAB_ACTION.talk, () => { faceMotion.talking = !faceMotion.talking; });
      buttons.hair = btn('HAIR · ON', SARAH_LAB_ACTION.hair, () => { hairOn = !hairOn; for (const m of hairMeshes) m.visible = hairOn; });
      for (const b of [buttons.face, buttons.hair, buttons.eyes, buttons.blink, buttons.talk]) { b.dataset.tab = 'face'; b.style.padding = '8px 10px'; b.style.fontSize = '12px'; right.appendChild(b); }
      faceMouthInput = slider(SARAH_LAB_FIELD.faceMouth, 0, (v) => { faceMotion.mouth = v / 100; }, 100, 'face');
      const irises = document.createElement('div');
      irises.dataset.tab = 'face';
      irises.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:12px;letter-spacing:.05em';
      const irisLabel = document.createElement('span'); irisLabel.textContent = 'EYE COLOUR'; irises.appendChild(irisLabel);
      IRIS_CHOICES.forEach((c, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.dataset.action = `${SARAH_LAB_ACTION.faceIris}${c.name}`; b.title = c.name; b.setAttribute('aria-label', `${c.name} eyes`);
        b.style.cssText = `width:26px;height:26px;border-radius:50%;border:2px solid var(--sl-btn-line,#ffffff30);background:${c.swatch};padding:0;cursor:pointer`;
        b.addEventListener('click', (e) => { e.stopPropagation(); irisIndex = i; refresh(); });
        irisButtons.push(b); irises.appendChild(b);
      });
      right.appendChild(irises);
      slider(SARAH_LAB_FIELD.faceBrows, browPct, (v) => { browPct = v; }, 100, 'face');
      slider(SARAH_LAB_FIELD.faceLips, lipPct, (v) => { lipPct = v; }, 100, 'face');
    }
    // ------------------------------------------------------------ FACE: her skin's map (skinChoices.ts, skinPaint.ts)
    {
      const small = (b: HTMLButtonElement) => { b.style.padding = '7px 10px'; b.style.fontSize = '11px'; return b; };
      buttons.skin = btn(skinLine(skinId, skinUpload), SARAH_LAB_ACTION.skin, () => { skinId = nextSkin(skinId, !!skinUpload); applySkin(); });
      // the picker sits in the room's root, not the panel (the studio moves the panel's things and drops the rest)
      const file = document.createElement('input');
      file.type = 'file'; file.accept = 'image/*'; file.style.display = 'none'; file.dataset.role = 'sarahlab-skin-file';
      file.addEventListener('change', () => { const f = file.files?.[0]; file.value = ''; if (f) { skinState = 'loading'; refresh(); void uploadSkin(f); } });
      root.appendChild(file);
      buttons.skinUpload = btn('UPLOAD SKIN…', SARAH_LAB_ACTION.skinUpload, () => file.click());
      for (const b of [buttons.skin, buttons.skinUpload]) { b.dataset.tab = 'face'; b.style.padding = '8px 10px'; b.style.fontSize = '12px'; right.appendChild(b); }
      const note = document.createElement('div');
      note.dataset.tab = 'face'; note.dataset.field = SARAH_LAB_FIELD.skinNote;
      note.style.cssText = 'font:500 11px system-ui,sans-serif;color:var(--sl-muted,#9aa0a8);line-height:1.35';
      fields[SARAH_LAB_FIELD.skinNote] = note; right.appendChild(note);
      buttons.skinPaint = btn('PAINT SKIN · OFF', SARAH_LAB_ACTION.skinPaint, () => { skinPaintOn = !skinPaintOn; if (skinPaintOn) void ensurePainter(); else endSkinStroke(); });
      buttons.skinBare = btn('CLOTHES · SHOWN', SARAH_LAB_ACTION.skinBare, () => { skinBare = !skinBare; fabric?.setBare(skinBare); applyLook(); });
      for (const b of [buttons.skinPaint, buttons.skinBare]) { b.dataset.tab = 'face'; small(b); right.appendChild(b); }
      // the brush: shown while PAINT SKIN is on
      const tools = document.createElement('div');
      tools.dataset.tab = 'face'; tools.dataset.role = 'sarahlab-skin-brush';
      tools.style.cssText = 'display:none;flex-direction:column;gap:6px';
      skinTools = tools;
      const swatches = document.createElement('div');
      swatches.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;align-items:center';
      for (const c of SKIN_SWATCHES) {
        const b = document.createElement('button');
        b.type = 'button'; b.dataset.action = `${SARAH_LAB_ACTION.skinColour}${c.name}`; b.title = c.name; b.setAttribute('aria-label', c.name);
        b.style.cssText = `width:28px;height:28px;border-radius:50%;border:2px solid var(--sl-btn-line,#ffffff30);background:${c.hex};padding:0;cursor:pointer`;
        b.addEventListener('click', (e) => { e.stopPropagation(); brush.hex = c.hex; brush.erase = false; refresh(); });
        swatchButtons.set(c.hex, b); swatches.appendChild(b);
      }
      const any = document.createElement('input');
      any.type = 'color'; any.value = brush.hex; any.title = 'any colour'; any.setAttribute('aria-label', 'any colour');
      any.style.cssText = 'width:36px;height:30px;border:0;background:none;padding:0;cursor:pointer';
      any.addEventListener('input', () => { brush.hex = any.value; brush.erase = false; refresh(); });
      swatches.appendChild(any);
      tools.appendChild(swatches);
      // ...or a picture of his own, as the clothing takes one (Joshua, 2026-10-24)
      const picker = document.createElement('input');
      picker.type = 'file'; picker.accept = 'image/*'; picker.style.display = 'none'; picker.dataset.role = 'sarahlab-paint-texture-file';
      picker.addEventListener('change', () => { const f = picker.files?.[0]; picker.value = ''; if (f) void uploadPaintTexture(f); });
      root.appendChild(picker);
      const textureRow = document.createElement('div');
      textureRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;align-items:center';
      buttons.skinTextureUpload = btn('UPLOAD PAINT TEXTURE…', SARAH_LAB_ACTION.skinTextureUpload, () => picker.click());
      buttons.skinTexture = btn('PAINT WITH · COLOUR', SARAH_LAB_ACTION.skinTexture, () => { if (paintTexture) { brush.texture = !brush.texture; if (brush.texture) brush.erase = false; } });
      buttons.skinStamp = btn('TEXTURE · TILE', SARAH_LAB_ACTION.skinStamp, () => { brush.stamp = !brush.stamp; });
      for (const b of [buttons.skinTextureUpload, buttons.skinTexture, buttons.skinStamp]) textureRow.appendChild(small(b));
      tools.appendChild(textureRow);
      const range = (field: string, value: number, min: number, max: number, onInput: (v: number) => void) => {
        const label = document.createElement('div'); label.dataset.field = field; label.style.cssText = 'font-size:12px;letter-spacing:.05em'; fields[field] = label;
        const input = document.createElement('input'); input.type = 'range'; input.min = String(min); input.max = String(max); input.value = String(value);
        input.style.cssText = 'width:100%;accent-color:var(--sl-accent,#d4a853);height:28px';
        input.addEventListener('input', () => { onInput(Number(input.value)); refresh(); });
        tools.append(label, input);
      };
      range(SARAH_LAB_FIELD.skinBrush, Math.round(brush.cm * 10), Math.round(SKIN_BRUSH_CM.min * 10), Math.round(SKIN_BRUSH_CM.max * 10), (v) => { brush.cm = v / 10; });
      range(SARAH_LAB_FIELD.skinStrength, Math.round(brush.strength * 100), 5, 100, (v) => { brush.strength = v / 100; });
      range(SARAH_LAB_FIELD.skinTextureSize, Math.round(brush.textureCm * 10), Math.round(SKIN_TEXTURE_CM.min * 10), Math.round(SKIN_TEXTURE_CM.max * 10), (v) => { brush.textureCm = v / 10; });
      textureSize = tools.lastElementChild as HTMLInputElement;
      textureLabel = textureSize.previousElementSibling as HTMLElement;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
      buttons.skinHard = btn('EDGE · SOFT', SARAH_LAB_ACTION.skinHard, () => { brush.hard = !brush.hard; });
      buttons.skinErase = btn('ERASE · OFF', SARAH_LAB_ACTION.skinErase, () => { brush.erase = !brush.erase; });
      buttons.skinUndo = btn('UNDO', SARAH_LAB_ACTION.skinUndo, () => { painted?.painter.undo(); });
      buttons.skinRedo = btn('REDO', SARAH_LAB_ACTION.skinRedo, () => { painted?.painter.redo(); });
      buttons.skinClear = btn('CLEAR PAINT', SARAH_LAB_ACTION.skinClear, () => { painted?.painter.clear(); });
      buttons.skinSave = btn('SAVE PNG', SARAH_LAB_ACTION.skinSave, () => {
        const p = painted?.painter;
        if (p) void p.png().then((blob) => savePicture(blob, `sarah-skin-${skinWorn}-painted.png`)).catch((e) => console.error('[sarahlab] the painted skin could not be saved', e));
      });
      for (const b of [buttons.skinHard, buttons.skinErase, buttons.skinUndo, buttons.skinRedo, buttons.skinClear, buttons.skinSave]) row.appendChild(small(b));
      tools.appendChild(row);
      const tip = document.createElement('div');
      tip.style.cssText = 'font:500 10.5px system-ui,sans-serif;color:var(--sl-muted,#9aa0a8);line-height:1.35';
      tip.textContent = 'One finger paints her, two turn and zoom. Paint stays on this skin until SKIN changes; SAVE PNG keeps it, and UPLOAD SKIN puts a saved one back on her.';
      tools.appendChild(tip);
      right.appendChild(tools);
    }
    // the view: zoom and the start view sit with the poses (the angles float over her, below)
    for (const [label, action, go] of [['ZOOM −', SARAH_LAB_ACTION.zoomOut, () => zoom(1.25)], ['ZOOM +', SARAH_LAB_ACTION.zoomIn, () => zoom(0.8)], ['RESET VIEW', SARAH_LAB_ACTION.resetView, resetView]] as const) {
      const b = btn(label, action, go); b.style.padding = '8px 10px'; b.style.fontSize = '12px'; b.dataset.tab = 'pose'; right.appendChild(b);
    }
    root.appendChild(right);

    // ------------------------------------------------------------ the studio
    studio = studioLayout(root, {
      first: 'body',
      theme,
      eyebrow: 'Sarah Lab',
      changed: () => {
        // an editor listens to her only while its section is open: a finger on her otherwise turns her
        fabric?.setActive(studio?.open === 'fabric' && !studio.folded);
        builder?.setActive(studio?.open === 'build' && !studio.folded);
        // her skin's brush listens only in FACE, and her clothes come back on as it closes
        if (studio?.open !== 'face' || studio.folded) { endSkinStroke(); if (skinBare) { skinBare = false; fabric?.setBare(false); applyLook(); } }
        const size = ctx.renderer.size(); frame(size.width, size.height, false); refresh();
      },
    });
    right.remove();
    studio.section('outfit').prepend(outfits.element);

    // the stage's top row: BACK, her name and the room's status line, then UNDO / REDO for her body and the theme
    const pill = () => { const p = document.createElement('div'); p.className = 'sl-pill'; return p; };
    const pillButton = (label: string, action: string, onClick: () => void, title = '') => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.dataset.action = action; if (title) { b.title = title; b.setAttribute('aria-label', title); }
      b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); refresh(); });
      return b;
    };
    const backPill = pill(); back.removeAttribute('style'); backPill.appendChild(back);
    const info = document.createElement('div');
    info.className = 'slab-info';
    info.style.cssText = 'flex:1;min-width:0;pointer-events:none;padding:2px 2px 0';
    const eyebrow = document.createElement('div');
    eyebrow.textContent = labTitle(BUILD_INFO.version);
    eyebrow.dataset.field = SARAH_LAB_FIELD.title;
    eyebrow.style.cssText = 'font:700 8.5px system-ui,sans-serif;letter-spacing:.18em;color:var(--sl-muted,#9aa0a8)';
    nameLine = document.createElement('div');
    nameLine.style.cssText = 'font:750 17px system-ui,sans-serif;letter-spacing:-.02em;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    fields.status = document.createElement('div');
    fields.status.dataset.field = SARAH_LAB_FIELD.status;
    fields.status.style.cssText = 'font:500 10px system-ui,sans-serif;color:var(--sl-muted,#9aa0a8);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    fields.cloth = document.createElement('div');
    fields.cloth.dataset.field = SARAH_LAB_FIELD.cloth;
    fields.cloth.style.cssText = 'font:600 10px system-ui,sans-serif;color:var(--sl-accent-deep,#2f6f5e);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:none';
    info.append(eyebrow, nameLine, fields.status, fields.cloth);
    const history = pill();
    buttons.undoBody = pillButton('↶', SARAH_LAB_ACTION.undoBody, () => travelBody(-1), 'Undo body change');
    buttons.redoBody = pillButton('↷', SARAH_LAB_ACTION.redoBody, () => travelBody(1), 'Redo body change');
    history.append(buttons.undoBody, buttons.redoBody);
    const themePill = pill();
    buttons.theme = pillButton('', SARAH_LAB_ACTION.theme, () => applyTheme(otherTheme(theme)), 'Light or dark');
    themePill.appendChild(buttons.theme);
    studio.stage.top.append(backPill, info, history, themePill);
    // the bottom row: the camera's angles, the start view and TURN
    const views = pill();
    for (const a of VIEW_ANGLES) {
      buttons[`view-${a.id}`] = pillButton(a.label, `${SARAH_LAB_ACTION.view}${a.id}`, () => { orbit.yaw = a.yaw; orbit.pitch = ORBIT_START.pitch; turning = false; });
      views.appendChild(buttons[`view-${a.id}`]);
    }
    views.appendChild(pillButton('⛶', SARAH_LAB_ACTION.fit, resetView, 'Whole figure'));
    buttons.turn.removeAttribute('style'); buttons.turn.textContent = '⟳'; buttons.turn.title = 'Turn her'; buttons.turn.setAttribute('aria-label', 'Turn her');
    views.appendChild(buttons.turn);
    studio.stage.bottom.appendChild(views);
    // the corner: a PHOTO of her as she is on screen
    const photoPill = pill();
    buttons.photo = pillButton('▣', SARAH_LAB_ACTION.photo, () => { void takePhoto(); }, 'Save a picture');
    photoPill.appendChild(buttons.photo);
    studio.stage.corner.appendChild(photoPill);
    card = loadingCard(document, () => retry());
    studio.stage.element.appendChild(card.element);
    ctx.uiLayer.appendChild(root);
    hud = root;
    applyTheme(theme);
    refresh();
  }
  function resetView(): void { aimHeld = false; orbit.yaw = ORBIT_START.yaw; orbit.pitch = ORBIT_START.pitch; orbit.distance = ORBIT_START.distance; orbit.target.copy(ORBIT_START.target); turning = false; }
  /** LIGHT or DARK (studioTheme.ts): the panels, and the stage behind her. Remembered on this device. */
  function applyTheme(next: StudioTheme): void {
    theme = next;
    studio?.setTheme(next);
    const look = THEME_STAGE[next];
    (three.background as THREE.Color).setHex(look.background);
    (floor.material as THREE.MeshStandardMaterial).color.setHex(look.floor);
    (ring.material as THREE.MeshBasicMaterial).color.setHex(look.rim);
    strip.setColours(look.floor, look.rim);
    storeTheme(localStore(), next);
  }
  /** Resolves after `n` more frames of the room (the bake below waits on the paint and the fabric to settle). */
  const frameWaiters: { left: number; done: () => void }[] = [];
  const frames = (n: number) => new Promise<void>((done) => frameWaiters.push({ left: n, done }));
  /**
   * THE BUILT-IN OUTFITS' PICTURES, for `npm run bake:outfits` (scripts/bakeOutfitThumbs.mjs), which opens the room with
   * `?bake=outfits`: each outfit the room offers is put on her in turn and pictured the way a saved one is.
   */
  async function bakeOutfitPictures(): Promise<{ name: string; path: string; picture: string | null }[]> {
    const out: { name: string; path: string; picture: string | null }[] = [];
    for (const i of offeredOutfits(garments)) {
      wornFrom = null; pendingClothes = null; nextSource = null;
      dress(i);
      for (let tries = 0; tries < 600 && !(outfit === i && wantedOutfit === null && model?.visible); tries++) await frames(1);
      await frames(12);
      out.push({ name: OUTFITS[i].name, path: outfitThumbPath(OUTFITS[i].name), picture: thumbnail() });
    }
    return out;
  }
  /**
   * SARAH FOR THE STORY PLAYER, for `scripts/sarahV2Recovery/story-sarah.mjs`, which opens the room with `?bake=story`
   * (storyBake.ts). READY once she is in, dressed, her hair on, the cloth tee laid and nothing loading.
   */
  function storyReady(): boolean {
    const phase = meter.snapshot().phase;
    return loaded && !failed && recovered && model?.visible === true && wantedOutfit === null && !clothLoading && skinState === 'ready'
      && !!partMeshes.get('spandex-lite')?.length && hairMeshes.length > 0 && !!faceMaterial && phase !== 'downloading' && phase !== 'preparing';
  }
  /**
   * The bake: the room's clock held, the cloth sim off so the fitted, skinned tee is what she wears (the story player
   * cannot run the cloth), her bind pose (T-POSE with ARMS at 0: every turn nothing, her arms down), her face OFF (the
   * story player lays it on `Material_0` itself), her springs at rest and two seconds of her own frames at a fixed step,
   * so what is measured on her each frame -- the fitted tee's navel -- is measured at rest, the same every run.
   */
  async function bakeForStory(options: { readonly splitPaint?: boolean } = {}): Promise<StoryBake> {
    if (!storyReady() || !model) throw new Error('[sarahlab] the story bake was asked for before she was ready');
    // her BUILD lives in her bones as much as in her skin, and the bake reads her rest shape through one bone
    // (`restSkinMatrix`): baked as she is, she would come out torn. Until the story file carries a build, it says so
    if (currentBuild().key) throw new Error('[sarahlab] the story bake does not carry her proportions yet (height, lengths, widths, sizes): RESET PROPORTIONS to bake her');
    clock.paused = true; clock.step = 0;
    try {
      clothWanted = false;
      if (clothOn) await toggleCloth();
      pose = 'tpose'; armsDeg = 0; armsOverride = false; curl = 0; faceOn = false; seated = 0; sitAmount = 0; sitMoving = false;
      settleMasses();
      applyLook(); refresh();
      for (let k = 0; k < 120; k++) advance(1 / 60);
      model.updateMatrixWorld(true);
      const b = bodyOf();
      if (!b) throw new Error('[sarahlab] the story bake found no body');
      const meshes: THREE.SkinnedMesh[] = [];
      // (her body, her clothes and her hair: not what is inside her or only there for her birth -- her vulva's parts, under
      // the leggings, came after the story file and drew more than one material each)
      model.traverseVisible((n) => { if ((n as THREE.SkinnedMesh).isSkinnedMesh && !STORY_LEAVES_OUT.has(n.name)) meshes.push(n as THREE.SkinnedMesh); });
      console.info('[sarahlab] story bake parts:', meshes.map((m) => m.name || '(unnamed)').join(', '));
      const keep = clothKeep();
      return collectStoryBake({
        renderer: ctx.renderer.gl, camera, meshes, body: b.mesh, hair: hairMeshes, splitPaint: options.splitPaint,
        // SIT as the room sits her: its correctives, and her bump's tilt handed to her thighs (`seated` 1)
        seat: (on) => { pose = on ? 'sit' : 'tpose'; seated = on ? 1 : 0; sitAmount = on ? 1 : 0; sitMoving = false; applyLook(); applyMotion(); },
        facts: {
          look: SARAH_LOOK?.clothes.outfit ?? null, outfit: OUTFITS[outfit].name, bump, shape: serializeShape(body), pregnancy, bellyCurve, refine,
          skin: { chosen: skinId, worn: skinWorn, own: b.material.map === ownMap(b.material), painted: !!painted },
          cloth: { on: clothOn, wanted: clothWanted, made: !!cloth }, fittedTee: !!fittedTee(), fittedLaid, keep,
          teeDetail: fitted ? fitted.spots.fitted(keep, fitted.navel) : null,
          face: { on: faceOn, laid: !!faceMaterial }, hair: hairOn, pose, armsDeg, armsOverride, curl, garmentView, skinBare,
          springs: { belly: { ...masses.belly }, breastL: { ...masses.breastL }, breastR: { ...masses.breastR } },
          drawn: (() => { const out: string[] = []; three.traverseVisible((n) => { const m = n as THREE.Mesh; if (m.isMesh) out.push(`${m.name}|${(Array.isArray(m.material) ? m.material[0] : m.material).name}|${m.geometry.getAttribute('position')?.count}`); }); return out; })(),
        },
      });
    } finally { clock.paused = false; }
  }
  /**
   * A CARD'S PICTURE (Joshua, 2026-10-23: "we could have little screenshots for the outfit"): her, head to foot, from
   * the front three-quarter, whatever the view on screen -- so every card shows her the same way -- small enough to
   * keep in a save (a 3:4 JPEG of THUMB_SIZE). Null before she is on.
   */
  function thumbnail(): string | null {
    const bodyMesh = skinned.find(m => !!m.geometry.getAttribute('_cloth_cover')) ?? skinned[0];
    if (!model?.visible || !bodyMesh) return null;
    model.updateMatrixWorld(true);
    // her height from her own skeleton as posed (the floor up to a head's width over her highest joint, so she is whole
    // sitting as well as standing); her width a fixed allowance about her middle, as her arms may be out
    const at = new THREE.Vector3(), mid = new THREE.Vector3();
    let low = 0, high = -Infinity;
    for (const bone of bodyMesh.skeleton.bones) { bone.getWorldPosition(at); low = Math.min(low, at.y); high = Math.max(high, at.y); mid.add(at); }
    if (!Number.isFinite(high)) return null;
    mid.divideScalar(Math.max(1, bodyMesh.skeleton.bones.length));
    const box = new THREE.Box3(new THREE.Vector3(mid.x - 0.3 * M, low, mid.z - 0.28 * M), new THREE.Vector3(mid.x + 0.3 * M, high + 0.1 * M, mid.z + 0.28 * M));
    const size = ctx.renderer.size(), lens = new THREE.PerspectiveCamera(30, 1, 1, 10);
    frameBox(lens, box, { yaw: 0.5, pitch: 0.06, renderAspect: size.width / Math.max(1, size.height), fitAspect: THUMB_SIZE.width / THUMB_SIZE.height, margin: 1.04 });
    // the floor runs on behind her: the far plane reaches past it, not just past her
    lens.far = lens.position.distanceTo(box.getCenter(new THREE.Vector3())) + 3 * M; lens.updateProjectionMatrix();
    const picture = shootDataUrl(ctx.renderer.gl, three, lens, { width: THUMB_SIZE.width, height: THUMB_SIZE.height, quality: 0.8 });
    ctx.renderer.render(three, camera);
    return picture;
  }
  /**
   * PHOTO (from the Character Studio preview): what the stage shows of her, at the screen's full resolution, handed to
   * the share sheet where there is one (an iPhone home-screen app) and downloaded elsewhere.
   */
  async function takePhoto(): Promise<void> {
    const gl = ctx.renderer.gl, whole = shoot(gl, three, camera);
    ctx.renderer.render(three, camera);
    if (!whole || !studio) return;
    const canvasRect = gl.domElement.getBoundingClientRect(), stageRect = studio.stage.element.getBoundingClientRect();
    const k = whole.width / Math.max(1, canvasRect.width);
    const x = Math.max(0, Math.round((stageRect.left - canvasRect.left) * k)), y = Math.max(0, Math.round((stageRect.top - canvasRect.top) * k));
    const w = Math.min(whole.width - x, Math.round(stageRect.width * k)), h = Math.min(whole.height - y, Math.round(stageRect.height * k));
    const crop = document.createElement('canvas'); crop.width = Math.max(1, w); crop.height = Math.max(1, h);
    crop.getContext('2d')?.drawImage(whole, x, y, w, h, 0, 0, crop.width, crop.height);
    const blob = await new Promise<Blob | null>((resolve) => crop.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) return;
    const name = `${(characters?.name() || 'sarah').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'sarah'}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.jpg`;
    // a share sheet that will not open this late after the tap: the picture is downloaded instead
    if (await savePicture(blob, name) === 'failed') {
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  }
  function zoom(factor: number): void {
    orbit.distance = Math.min(4.5 * M, Math.max(0.45 * M, orbit.distance * factor));
  }

  /**
   * Slide the camera up or down by a move on screen (pixels, down positive, on a view `viewHeight` pixels tall): she moves
   * with the fingers, as far on screen as they did at the distance she is seen from. Held between her feet and just above
   * her head.
   */
  function panBy(dyPixels: number, viewHeight: number): void {
    if (!Number.isFinite(dyPixels) || dyPixels === 0) return;
    const h = Math.max(1, Number.isFinite(viewHeight) ? viewHeight : 1);
    const perPixel = (2 * orbit.distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / h;
    orbit.target.y = Math.min(PAN_TOP * M, Math.max(PAN_BOTTOM * M, orbit.target.y + dyPixels * perPixel));
    turning = false;
    refresh();
  }

  // ------------------------------------------------------------- posing
  /** Where in her stride she is (0..1): the stride in bind units, `bindScale` of them to the metre. */
  function walkPhase(): number {
    if (!rig || !measure) return 0;
    return ((walked * rig.bindScale) / humanStride(measure, 'walk', bump / 100)) % 1;
  }
  /** Her walk's weight at `phase`, her WALK sway on it (bodyShape.ts `walkSway`). */
  const weightAt = (phase: number) => walkWeight(phase, 'walk', body.walkSway / 100);
  const weightOut: MutableJointTurn[] = [];
  /** Her turns in pose `p` (the room's own by default), the base pose written into `out`. */
  function turnsFor(p: SarahLabPose = pose, out: MutableJointTurn[] = poseOut): readonly JointTurn[] {
    if (!rig || !measure) return [];
    let base: readonly JointTurn[];
    if (isBirthPose(p)) {
      // a birth position: her standing arms, her back and legs as the position has them (actor/humanBirth.ts)
      const stood = poseHuman(measure, rig.bind, { stance: 'stand', phase: 0, seconds, lean: 0, carry: bump / 100 }, out);
      // (a squat birth: from her squat to sitting back on the mat as she lifts her baby to her chest)
      const sit = p === 'squat' ? squatSit() : 0, lean = p === 'squat' ? catchLean() : 0;
      let tweak = sit > 0 ? { ...blendBirthSpec(BIRTH_POSES.squat, FLOOR_SIT, sit), ...(birthTweak ?? {}) } : birthTweak;
      // (bent over to catch it: her back, chest and neck from there, SQUAT_CATCH.leanBy)
      if (lean > 0) { const s0 = { ...BIRTH_POSES.squat, ...(tweak ?? {}) }, L = SQUAT_CATCH.leanBy; tweak = { ...(tweak ?? {}), spine: s0.spine + L.spine * lean, chest: s0.chest + L.chest * lean, neck: s0.neck + L.neck * lean }; }
      const birth = poseBirth(measure, rig.bind, { style: p, seconds, bump: bump / 100, ...(tweak ? { tweak } : {}) }, birthOut);
      const mine = new Set(birth.map((t) => t.joint));
      base = [...stood.filter((t) => !mine.has(t.joint)), ...birth];
    } else if (p === 'sit') base = poseSeated(measure, rig.bind, { style: 'sit', seconds, posture: 'pregnant', bump: bump / 100, settled: settledSitFor(SARAH_LAB_MODELS[modelIndex].id) }, out);
    else {
      const stance = p === 'walk' ? 'walk' : 'stand';
      const carry = bump / 100;
      const phase = p === 'walk' ? walkPhase() : 0;
      base = poseHuman(measure, rig.bind, { stance, phase, seconds, lean: 0, carry }, out);
      // THE WALK'S WEIGHT (Joshua, 2026-11-08: "the body has no natural weight and bounce while walking"): her pelvis
      // lists and twists, her chest turns against it, and `place` shifts her over her standing foot (walkWeight.ts)
      if (stance === 'walk') base = weighWalk(measure, base, weightAt(phase), weightOut);
    }
    const overrideArms = p === 'tpose' || (!levelArmsModel(SARAH_LAB_MODELS[modelIndex].id) && armsOverride);
    // T-POSE restores the whole bind pose. Other poses keep their torso and legs,
    // and the unselected arm keeps its normal animation.
    if (p === 'tpose') base = base.map(turn => ({ ...turn, radians: 0 }));
    if (overrideArms) {
      const j = measure.joints, f = armsDeg / 90, side = ARM_SIDES[armSide];
      const selected = [
        ...(side !== 'right' ? [j.shoulderL, j.elbowL, j.wristL] : []),
        ...(side !== 'left' ? [j.shoulderR, j.elbowR, j.wristR] : []),
      ];
      // Removing all selected arm turns also restores elbows/wrists to bind at 0°,
      // instead of leaving a seated bend or walk swing underneath the slider.
      base = [...base.filter(turn => !selected.includes(turn.joint)), ...tPoseTurns(rig.bind, [
        { shoulder: j.shoulderL, elbow: j.elbowL, out: measure.leftSign > 0 ? 1 : -1, fraction: side === 'right' ? 0 : f },
        { shoulder: j.shoulderR, elbow: j.elbowR, out: measure.leftSign > 0 ? -1 : 1, fraction: side === 'left' ? 0 : f },
      ])];
    }
    // EVERY JOINT INSIDE ITS RANGE (Joshua, 2026-11-04, "two levels": data/jointRange.ts, actor/jointLimits.ts) -- her back,
    // neck, hips, knees and ankles held to what she moves them to herself, or, in a birth position (placed: the bed holds
    // her, her thighs let fall open, her weight on her feet), to how far they give placed
    // (a probe's random pose over this one: the skeleton-in-v2 test, held to her ranges as any pose is)
    if (randomTurns && p === pose) { const mine = new Set(randomTurns.map((t) => t.joint)); base = [...base.filter((t) => !mine.has(t.joint)), ...randomTurns]; }
    base = limitedTurns(base, isBirthPose(p) ? 'passive' : 'active', out);
    // (a birth position's knees and ankles as the table reads them: her feet are set on the mat from there, plantFeet)
    if (isBirthPose(p) && p === pose && jointLimits) birthAngles = jointLimits.passive.read(base);
    if (curl <= 0 || fingers.length === 0) return base;
    const extra: JointTurn[] = [];
    for (const f of fingers) {
      f.joints.forEach((j, k) => extra.push({ joint: j, ax: f.axis.x, ay: f.axis.y, az: f.axis.z, radians: fingerBend(curl, k, f.thumb) }));
    }
    return [...base, ...extra];
  }
  /** Her joint ranges, read once a skeleton, at each level (a woman's: Sarah's, as her arms' are); and each pose's own
   * place to write its held turns, so a pose blended with another keeps its own. */
  let jointLimits: { measure: HumanMeasure; active: JointLimits; passive: JointLimits } | null = null, birthAngles: JointAngles | null = null;
  /** A probe's random pose (`randomPose`): turns laid over the pose's own, then held to her ranges like any pose. */
  let randomTurns: JointTurn[] | null = null;
  /**
   * A random pose for the skeleton-in-v2 test (Joshua, 2026-11-09: "doing random poses to make sure the skeleton doesn't
   * come through the skin"): her back, neck, hips, knees, ankles, shoulders and elbows each turned by a random share of a
   * span about her body's own axes (x across to her left, y up, z forward), from `seed`; her back, neck, hips, knees and
   * ankles then held to the joint table. The spans are GAME TUNING (wide, so the table's walls are reached).
   */
  function randomPoseTurns(seed: number): JointTurn[] {
    if (!measure) return [];
    let x = (seed * 2654435761) >>> 0 || 1;
    const rnd = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
    const span = (lo: number, hi: number) => ((lo + (hi - lo) * rnd()) * Math.PI) / 180;
    const j = measure.joints, L = measure.leftSign > 0 ? 1 : -1, q = new THREE.Quaternion(), e = new THREE.Euler(), out: JointTurn[] = [];
    // (flex is about x: negative swings a limb hanging down forward; side about z, roll about y)
    const turn = (joint: number, flex: number, side: number, roll: number) => {
      q.setFromEuler(e.set(flex, roll, side, 'XZY'));
      const a = 2 * Math.acos(Math.min(1, Math.abs(q.w))), s2 = Math.sqrt(Math.max(1e-12, 1 - q.w * q.w)), g = q.w < 0 ? -1 : 1;
      if (a > 1e-6) out.push({ joint, ax: (g * q.x) / s2, ay: (g * q.y) / s2, az: (g * q.z) / s2, radians: a });
    };
    turn(j.spine, span(-25, 45), span(-15, 15), span(-20, 20));
    turn(j.chest, span(-15, 30), span(-12, 12), span(-20, 20));
    turn(j.neck, span(-30, 40), span(-25, 25), span(-45, 45));
    for (const [hip, knee, ankle, sh, el, sgn] of [[j.hipL, j.kneeL, j.ankleL, j.shoulderL, j.elbowL, L], [j.hipR, j.kneeR, j.ankleR, j.shoulderR, j.elbowR, -L]] as const) {
      turn(hip, -span(-15, 110), sgn * span(-10, 40), span(-35, 35));
      turn(knee, span(0, 130), 0, 0);
      turn(ankle, span(-30, 40), 0, 0);
      turn(sh, -span(-40, 160), sgn * span(-10, 150), span(-60, 60));
      turn(el, -span(0, 140), 0, 0);
    }
    return out;
  }
  const limitedOut = new WeakMap<MutableJointTurn[], MutableJointTurn[]>();
  function limitedTurns(turns: readonly JointTurn[], level: RangeLevel, owner: MutableJointTurn[]): readonly JointTurn[] {
    if (!rig || !measure) return turns;
    if (jointLimits?.measure !== measure) {
      const at = (lv: RangeLevel) => new JointLimits(measure!, rig!.bind, (j, m) => rangeDeg(j, m as never, 'female', lv));
      jointLimits = { measure, active: at('active'), passive: at('passive') };
    }
    let out = limitedOut.get(owner); if (!out) { out = []; limitedOut.set(owner, out); }
    return jointLimits[level].limit(turns, out);
  }

  /**
   * RECLINED, HER PALMS ON HER KNEES (Joshua, 2026-11-03: "place Sarah's palms on her knees as I couldn't tell if the
   * Baby's foot was sticking out of Sarah's hand, plus, would be more realistic"). A pass over her bones as they are
   * drawn this frame -- her build lengthens them, so a reach worked out on her bind missed -- each arm reached by its two
   * bones to put the hand flat on the top of its thigh just above the knee, fingers along the thigh toward it, palm down,
   * elbow out to her side.
   */
  const kneeTips: Record<string, THREE.Vector3> = {};
  /** each arm's last reach: where it was asked to, and the finger turn and elbow place it chose (handsOnKnees) */
  const armSearch: Record<string, { last: THREE.Vector3; full: THREE.Vector3; fi: number; pi: number } | undefined> = {};
  /**
   * HER TORSO'S SKIN AS DRAWN THIS FRAME (ARM_IN_HER, skinContact.ts): which of her triangles are sampled is chosen once a
   * body, on her rest shape -- in the box, and none whose corners her arms, her neck or her head carry most (her own arm
   * would read as skin round itself); laid afresh each call from her as she is posed now.
   */
  let torsoTris: { mesh: THREE.SkinnedMesh; corners: Uint32Array } | null = null, torsoPose: SkinPose | null = null;
  const torsoContact = new SkinContact();
  function torsoSkin(sk: THREE.SkinnedMesh): SkinContact | null {
    const f = babyFrame, j = measure?.joints;
    if (!f || !j) return null;
    if (torsoTris?.mesh !== sk) {
      const g = sk.geometry, pos = g.getAttribute('position') as THREE.BufferAttribute, si = g.getAttribute('skinIndex'), sw = g.getAttribute('skinWeight');
      if (!pos || !si || !sw) return null;
      // (the bones that are her arms, her neck and her head: each under one of these)
      const bones = sk.skeleton.bones, roots = [j.shoulderL, j.shoulderR, j.neck].map((i) => bones[i]).filter(Boolean);
      const off = new Uint8Array(bones.length);
      bones.forEach((b, i) => { for (let o: THREE.Object3D | null = b; o; o = o.parent) if (roots.includes(o as THREE.Bone)) { off[i] = 1; break; } });
      const carried = (v: number): boolean => { let most = 0, at = 0; for (let k = 0; k < 4; k++) { const w = sw.getComponent(v, k); if (w > most) { most = w; at = si.getComponent(v, k); } } return off[at] === 1; };
      const X = ARM_IN_HER.box, restOf = (v: number, out: THREE.Vector3) => out.fromBufferAttribute(pos, v).applyMatrix4(f.meshToRest), v3 = new THREE.Vector3();
      const inBox = (v: number) => { restOf(v, v3); return Math.abs(v3.x) < X.across && v3.y > X.from && v3.y < X.to && v3.z > X.back && !carried(v); };
      torsoTris = { mesh: sk, corners: spreadTriangles(g.index ? g.index.array : null, pos.count, restOf, (a, b, c) => inBox(a) && inBox(b) && inBox(c), ARM_IN_HER.spacing) };
      torsoPose = new SkinPose(sk);
    }
    if (!torsoPose || torsoTris.corners.length === 0) return null;
    torsoPose.refresh();
    torsoContact.lay(torsoPose, torsoTris.corners, ARM_IN_HER.cell * M);
    return torsoContact;
  }
  /** Each arm's joints as a real arm's (armJoints.ts), read once from her skeleton's bind. */
  const armJointsFor = new Map<string, ArmJoints>();
  function armJointsOf(name: 'L' | 'R', sk: THREE.SkinnedMesh, sh: number, el: number, wr: number, h: { tip: number; knuckles: number[]; index: number; little: number }, other: number): ArmJoints {
    const key = `${sk.uuid}|${name}`;
    let a = armJointsFor.get(key);
    if (!a) {
      const j = measure!.joints;
      // (Sarah: a woman's ranges)
      a = new ArmJoints(sk.skeleton.bones, sk.skeleton.boneInverses, { shoulder: sh, elbow: el, wrist: wr, tip: h.tip, knuckles: h.knuckles[0], index: h.index, little: h.little, otherShoulder: other, hips: j.pelvis, neck: j.neck }, 'female');
      armJointsFor.set(key, a);
    }
    return a;
  }
  /**
   * THE CATCH (P3b, SQUAT): how far each hand has gone to her first baby as it is born -- her left as its head comes out,
   * her right as its body follows -- until it lies on her chest (0 .. 1); 0 in any other position, before, after, or with
   * HOLD on her knees.
   */
  function catchShareOf(name: 'L' | 'R'): number {
    if (pose !== 'squat' || !birthNow || babyHold === 'knees') return 0;
    const b = birthNow.babies[0];
    if (!b || b.onHer >= 1) return 0;
    const sm = (a: number, c: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (c - a))); return t * t * (3 - 2 * t); };
    return name === 'L' ? sm(SQUAT_CATCH.head[0], SQUAT_CATCH.head[1], b.down) : sm(SQUAT_CATCH.body[0], SQUAT_CATCH.body[1], b.down);
  }
  /** How far she is bent over to catch it (SQUAT_CATCH.lean): 0 .. 1. */
  function catchLean(): number {
    if (pose !== 'squat' || !birthNow || babyHold === 'knees') return 0;
    const b = birthNow.babies[0]; if (!b) return 0;
    const sm = (a: number, c: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (c - a))); return t * t * (3 - 2 * t); };
    return sm(SQUAT_CATCH.lean[0], SQUAT_CATCH.lean[1], b.down) * (1 - sm(SQUAT_CATCH.leanOff[0], SQUAT_CATCH.leanOff[1], b.onHer));
  }
  /** Where each hand holds it as she catches it: palm up under it (her left under its head, her right under its body),
   * fingers pointing ahead of her -- and, as it is lifted to her chest, on to where her hands rest on it lying there. */
  function catchTarget(name: 'L' | 'R', handLen: number, perM: number): { tip: THREE.Vector3; along: THREE.Vector3; face: THREE.Vector3 } | null {
    const r = babyRoots()[0], sk = bodyOf()?.mesh;
    if (!r || !sk || !measure || !birthNow) return null;
    const head = r.getObjectByName(BABY_BONES.head), hips = r.getObjectByName(BABY_BONES.hips), chest = r.getObjectByName('Bone_003');
    if (!head || !hips || !chest) return null;
    r.updateMatrixWorld(true);
    const bones = sk.skeleton.bones, j = measure.joints, wp = (b: THREE.Object3D) => b.getWorldPosition(new THREE.Vector3());
    // ahead of her, level: from between her hips toward between her knees
    const ahead = wp(bones[j.kneeL]).add(wp(bones[j.kneeR])).sub(wp(bones[j.hipL])).sub(wp(bones[j.hipR])); ahead.y = 0;
    if (ahead.lengthSq() < 1e-12) ahead.set(0, 0, 1);
    ahead.normalize();
    const down = new THREE.Vector3(0, -1, 0), C = SQUAT_CATCH, k = r.scale.x / 0.33;
    const at = name === 'L' ? wp(head) : wp(chest).lerp(wp(hips), 0.5), under = (name === 'L' ? headRadiusOf(r.scale.x) : C.under * k) * perM;
    // ON it, hanging: her palm on its side toward her shoulder, her fingers down round it, the back of her hand away from it
    const toHer = wp(bones[name === 'L' ? j.shoulderL : j.shoulderR]).sub(at).normalize(), round = down.clone().addScaledVector(toHer, -down.dot(toHer)).normalize();
    const onTip = at.clone().addScaledVector(toHer, under + BABY_HANDS.palm * perM).addScaledVector(round, handLen * BABY_HANDS.palmAt);
    // UNDER it, swung up: palm up under it, fingers ahead of her
    const tip = at.addScaledVector(down, under + BABY_HANDS.palm * perM).addScaledVector(ahead, handLen * BABY_HANDS.palmAt);
    const catching = { tip, along: ahead.clone(), face: down.clone() };
    { const x = Math.min(1, Math.max(0, (birthNow.babies[0].down - C.swingFrom) / C.under2)), u = x * x * (3 - 2 * x);
      if (u < 1) { catching.tip.copy(onTip).lerp(tip, u); catching.along.copy(round).lerp(ahead, u).normalize(); catching.face.copy(toHer).lerp(down, u).normalize(); } }
    // (lifted to her chest: from under it to on it)
    const up = birthNow.babies[0].onHer;
    if (up <= 0) return catching;
    const lying = babyLyingTarget(name, handLen, perM, true);
    if (!lying) return catching;
    const u = up * up * (3 - 2 * up);
    catching.tip.lerp(lying.tip, u); catching.along.lerp(lying.along, u).normalize(); catching.face.lerp(lying.face, u).normalize();
    return catching;
  }
  /** The body a baby is drawn with now (its straight one once born, else its curled one). */
  function drawnMeshOf(r: THREE.Object3D): THREE.SkinnedMesh | null {
    const own = straightOf(r);
    if (own?.visible) return own;
    let mesh: THREE.SkinnedMesh | null = null; r.traverse((o) => { const m = o as THREE.SkinnedMesh; if (!mesh && m.isSkinnedMesh && m.visible) mesh = m; });
    return mesh;
  }
  /** A baby body's chest and hips points (every third vertex, by the bone it follows most), once a geometry: what a palm
   * lies on (settlePitch's pick, for any of its bodies). */
  const trunkPicks = new WeakMap<THREE.BufferGeometry, { chest: Uint32Array; hips: Uint32Array }>();
  function trunkPick(m: THREE.SkinnedMesh): { chest: Uint32Array; hips: Uint32Array } {
    if (m === pitchFor && pitchPick) return pitchPick;
    let p = trunkPicks.get(m.geometry);
    if (p) return p;
    const bones = m.skeleton.bones, SI = m.geometry.getAttribute('skinIndex'), SW = m.geometry.getAttribute('skinWeight'), c: number[] = [], h: number[] = [];
    for (let i = 0; i < SI.count; i += 3) { let b = 0, w = -1; for (let k = 0; k < 4; k++) if (SW.getComponent(i, k) > w) { w = SW.getComponent(i, k); b = SI.getComponent(i, k); } const nm = bones[b]?.name; if (nm === 'Bone_003' || nm === 'Bone_002' || nm === 'Bone_004') c.push(i); else if (nm === BABY_BONES.root || nm === BABY_BONES.hips || nm === 'Bone_006') h.push(i); }
    p = { chest: Uint32Array.from(c), hips: Uint32Array.from(h) };
    trunkPicks.set(m.geometry, p);
    return p;
  }
  /**
   * WHERE ON HER BABY EACH HAND GOES (P2, POSITION A -- resting on her, skin to skin): her LEFT palm flat across its upper
   * back between its shoulder blades, her RIGHT palm over its bottom, fingers across it toward her other side; each a
   * fingertip, the way the fingers point and the way the back of the hand faces (out from its skin), in the world. Its
   * skin there is read off it as drawn this frame (its chest's and its hips' points, settlePitch's): the furthest of them
   * out from her, so the palm lies on it, not in it. Null while it is not lying on her.
   */
  function babyHandTarget(name: 'L' | 'R', handLen: number, perM: number): { tip: THREE.Vector3; along: THREE.Vector3; face: THREE.Vector3; elbow?: THREE.Vector3; elbowK?: number; share?: number } | null {
    // TWINS (P3, Joshua 2026-11-04: "her hands on both"): her left hand on the first, her right on the second once it
    // is on her (`twinHandShare`); in her arms, one in each
    if (babyCount >= 2 && name === 'R' && !(twinHandShare > 0)) return null;
    const twinR = babyCount >= 2 && name === 'R';
    const lying = babyLyingTarget(name, handLen, perM);
    if (!(cradleShare > 0)) return lying && twinR ? { ...lying, share: twinHandShare } : lying;
    // (into her arms: from where the hand was on it lying on her to where it holds it cradled)
    const held = babyCradleTarget(name, handLen, perM);
    if (!held) return lying && twinR ? { ...lying, share: twinHandShare } : lying;
    const k = cradleShare * cradleShare * (3 - 2 * cradleShare);
    if (!lying) return { ...held, elbowK: k, ...(twinR ? { share: twinHandShare } : {}) };
    lying.tip.lerp(held.tip, k); lying.along.lerp(held.along, k).normalize(); lying.face.lerp(held.face, k).normalize();
    return { ...lying, elbow: held.elbow, elbowK: k, ...(twinR ? { share: twinHandShare } : {}) };
  }
  /** POSITION B's hands (P2): her left palm under its bottom, her forearm under its back and her elbow's crook under its
   * head; her right palm on its tummy -- read off it as it is drawn, as babyLyingTarget's are. */
  function babyCradleTarget(name: 'L' | 'R', handLen: number, perM: number): { tip: THREE.Vector3; along: THREE.Vector3; face: THREE.Vector3; elbow?: THREE.Vector3 } | null {
    // (twins: each hand holds its own, as her left holds one baby: under its bottom, its head in her elbow)
    const twin = babyCount >= 2 && name === 'R', r = babyRoots()[twin ? 1 : 0], m = twin && r ? drawnMeshOf(r) : pitchFor, pick = m ? trunkPick(m) : null, cr = cradleOf(twin ? 1 : 0);
    if (!r || !m || !pick || !cr || !babyHolder || !birthNow || !bornStage(birthNow)) return null;
    const hipB = r.getObjectByName(BABY_BONES.hips), chestB = r.getObjectByName('Bone_003'), neckB = r.getObjectByName(BABY_BONES.neck), headB = r.getObjectByName(BABY_BONES.head);
    if (!hipB || !chestB || !neckB || !headB) return null;
    const H = hipB.getWorldPosition(new THREE.Vector3()), C = chestB.getWorldPosition(new THREE.Vector3()), Hd = headB.getWorldPosition(new THREE.Vector3());
    const long = neckB.getWorldPosition(new THREE.Vector3()).sub(H).normalize();
    // toward her (its back), in the world
    const toHer = cr.back.clone().transformDirection(babyHolder.matrixWorld); toHer.addScaledVector(long, -toHer.dot(long)).normalize();
    const B = BABY_HANDS, Cr = BABY_CRADLE, v = new THREE.Vector3();
    const surface = (at: THREE.Vector3, way: THREE.Vector3, P: Uint32Array): number => { let most = -Infinity; for (let q = 0; q < P.length; q += 2) { m.getVertexPosition(P[q], v); m.localToWorld(v); most = Math.max(most, v.sub(at).dot(way)); } return most; };
    m.skeleton.update();
    if (name === 'L' || twin) {
      // under its bottom, palm up to it, fingers down its length toward its feet; her elbow's crook under its head
      const most = surface(H, toHer, pick.hips); if (!Number.isFinite(most)) return null;
      const along = long.clone().negate();
      const tip = H.clone().addScaledVector(toHer, most + B.palm * perM).addScaledVector(along, handLen * B.palmAt);
      const elbow = Hd.clone().addScaledVector(toHer, Cr.crook * perM).addScaledVector(long, Cr.past * perM);
      return { tip, along, face: toHer.clone(), elbow };
    }
    // on its tummy, palm down onto it, fingers along it toward its head
    const at = C.clone().lerp(H, Cr.tummy), away = toHer.clone().negate(), most = surface(at, away, pick.chest);
    if (!Number.isFinite(most)) return null;
    const tip = at.clone().addScaledVector(away, most + B.palm * perM).addScaledVector(long, handLen * B.palmAt);
    return { tip, along: long.clone(), face: away };
  }
  function babyLyingTarget(name: 'L' | 'R', handLen: number, perM: number, lifting = false): { tip: THREE.Vector3; along: THREE.Vector3; face: THREE.Vector3 } | null {
    // (twins: her right hand on the second twin, her left on the first)
    const twin = babyCount >= 2 && name === 'R', r = babyRoots()[twin ? 1 : 0], m = twin && r ? drawnMeshOf(r) : pitchFor, pick = m ? trunkPick(m) : null;
    if (!r || !m || !pick || !birthNow || (!bornStage(birthNow) && !lifting)) return null;
    const hipB = r.getObjectByName(BABY_BONES.hips), chestB = r.getObjectByName('Bone_003'), neckB = r.getObjectByName(BABY_BONES.neck);
    if (!hipB || !chestB || !neckB) return null;
    const H = hipB.getWorldPosition(new THREE.Vector3()), C = chestB.getWorldPosition(new THREE.Vector3()), Nk = neckB.getWorldPosition(new THREE.Vector3());
    const long = Nk.clone().sub(H).normalize();
    // (its back: away from her skin under it)
    const face = new THREE.Vector3(); { const [b] = nearestHerSkin(C.clone().add(H).multiplyScalar(0.5)); if (b >= 0) face.fromArray(herSkin.nrm, b * 3); else face.set(0, 1, 0); }
    face.addScaledVector(long, -face.dot(long)).normalize();
    // (twins: her right hand over the second's bottom, as it is over one baby's -- on its upper back her arm stood up high)
    const onBack = name === 'L';
    // (sat back on the mat after a squat birth her right shoulder is further from its bottom than lying back on a bed: her
    // right arm stood out straight 5 cm short of it, so her palm is on the top of its bottom, `squatUp` further up it)
    const B = BABY_HANDS, at = onBack ? C.clone().lerp(Nk, B.backUp) : H.clone().addScaledVector(long, (-B.bottomDown + (pose === 'squat' ? B.squatUp : 0)) * perM);
    // its skin over that point: the furthest out along its back of its points there
    const P = onBack ? pick.chest : pick.hips, v = new THREE.Vector3(); let most = -Infinity;
    m.skeleton.update();
    for (let q = 0; q < P.length; q += 2) { m.getVertexPosition(P[q], v); m.localToWorld(v); most = Math.max(most, v.sub(at).dot(face)); }
    if (!Number.isFinite(most)) return null;
    // (the back of the hand a little more toward its feet on its bottom: cupped over the round of it)
    const back = onBack ? face.clone() : face.clone().addScaledVector(long, -B.bottomCup).normalize();
    // fingers across its back from this hand's side of her toward the other (her left is the way from her right shoulder to
    // her left); on its bottom, down over it toward its legs and a little across (from above, her wrist on the small of its
    // back: straight across, her wrist stood a hand out to its side and her right arm could not reach it)
    const sj = measure!.joints, sk = bodyOf()!.mesh.skeleton.bones, herLeft = sk[sj.shoulderL].getWorldPosition(new THREE.Vector3()).sub(sk[sj.shoulderR].getWorldPosition(new THREE.Vector3())).normalize();
    const along = name === 'L' ? herLeft.clone().negate() : long.clone().multiplyScalar(-B.bottomFeet).addScaledVector(herLeft, 1 - B.bottomFeet);
    along.addScaledVector(back, -along.dot(back)).normalize();
    // the palm's middle over the point, the fingertip half a hand on, the palm its thickness off its skin
    const tip = at.clone().addScaledVector(face, most).addScaledVector(back, B.palm * perM).addScaledVector(along, handLen * B.palmAt);
    return { tip, along, face: back };
  }
  function handsOnKnees(): void {
    kneeHold = null;
    // (RECLINE; and SQUAT -- her hands on her knees as she pushes, catching her baby, holding it as she sits back: P3b)
    // (and standing at the TOUCH bench, P4: only the hand that reaches)
    if ((pose !== 'recline' && pose !== 'squat' && !touchHere()) || !model || !rig || !measure) return;
    // (her own skeleton: the model also carries her baby's, which has more bones)
    const sk = bodyOf()?.mesh; if (!sk) return;
    const bones = sk.skeleton.bones, j = measure.joints, B = rig.bind, K = KNEE_HANDS;
    model.updateMatrixWorld(true);
    const wp = (i: number) => bones[i].getWorldPosition(new THREE.Vector3());
    const hand = handJointsOf(B);
    const out: Record<string, number> = {};
    { let top: THREE.Object3D = bones[0]; while (top.parent && (top.parent as THREE.Bone).isBone) top = top.parent; (top.parent ?? top).updateMatrixWorld(true); }
    // her torso as drawn now, for her arms to keep out of (ARM_IN_HER)
    const t0 = performance.now(), torso = torsoSkin(sk), AI = ARM_IN_HER;
    out.contactMs = performance.now() - t0;
    const arm = (sh: number, el: number, wr: number, hip: number, knee: number, ankle: number, other: number, name: 'L' | 'R') => {
      const h = hand[name === 'L' ? 0 : 1]; if (!h || bones[el]?.parent !== bones[sh] || bones[wr]?.parent !== bones[el]) return;
      const S = wp(sh), H = wp(hip), Kn = wp(knee), A = wp(ankle), td = Kn.clone().sub(H), thigh = td.length(); td.normalize();
      // (world units a metre, from her thigh as drawn against its bind length)
      const bindThigh = Math.hypot(B[knee].x - B[hip].x, B[knee].y - B[hip].y, B[knee].z - B[hip].z) / rig!.bindScale, perM = thigh / Math.max(1e-6, bindThigh);
      // the top of the thigh: away from the way the shin folds
      const sd = A.clone().sub(Kn).normalize(), top = sd.clone().addScaledVector(td, -sd.dot(td)).negate().normalize();
      const handLen = wp(h.tip).distanceTo(wp(wr));
      // (at the TOUCH bench, P4: this hand to what it touches; standing, a hand with nothing to touch is left as posed)
      const touch = touchTargetOf(name, handLen, perM);
      if (!isBirthPose(pose) && !touch) return;
      // OVER THE TOP OF HER KNEE (2026-11-04): flat on the top of her raised thigh, fingers up it to the knee, her arm came
      // down onto it so steeply her wrist was bent back past what a wrist does (Joshua: "it looks really uncomfortable");
      // on the knee's point, past her reach. So the palm lies `capTilt` of the way from her thigh's top round to her knee's
      // point (away from her thigh and her shin both), its fingertips over the crest of her knee, `capPast` beyond it and
      // `capOut` off the bone (her knee's skin)
      { const point = td.clone().sub(sd).normalize(), face = top.clone().lerp(point, K.capTilt).normalize();
        const along = td.clone().addScaledVector(face, -td.dot(face)).normalize(); top.copy(face); td.copy(along); }
      const T = Kn.clone().addScaledVector(top, K.capOut * perM).addScaledVector(td, K.capPast * perM);
      // HER HANDS ON HER BABY (P2; Joshua, 2026-11-03: "where she can actually hold the baby instead of it laying with no
      // hands from her"): from her knee to where on it this hand goes (babyHandTarget), `babyHoldShare` of the way -- the
      // fingertip, the way the fingers point and the way the palm's back faces all carried over together
      // CAUGHT IN HER OWN HANDS (P3b, SQUAT; Joshua, 2026-11-04): as its head comes out her left hand goes under it, as
      // its body follows her right under that; both carry it up to her chest as she sits back -- where they come to rest
      // on it as on any baby lying on her (babyLyingTarget), the hold from then on
      const caught = catchShareOf(name), held = caught > 0 ? catchTarget(name, handLen, perM) : null;
      if (held) {
        const k = caught * caught * (3 - 2 * caught);
        T.lerp(held.tip, k); td.lerp(held.along, k).normalize(); top.lerp(held.face, k);
        top.addScaledVector(td, -top.dot(td)).normalize();
        out[name + 'Catch'] = +k.toFixed(2);
      }
      const onBaby = babyHoldShare > 0 && !held ? babyHandTarget(name, handLen, perM) : null;
      // (holding it in her arms, her elbow is where its head lies: the elbow's place round her arm chosen nearest that)
      const elbowWant = onBaby?.elbow && onBaby.elbowK ? { at: onBaby.elbow, k: onBaby.elbowK } : null;
      if (onBaby) {
        const h = babyHoldShare * (onBaby.share ?? 1), k = h * h * (3 - 2 * h);
        T.lerp(onBaby.tip, k); td.lerp(onBaby.along, k).normalize(); top.lerp(onBaby.face, k);
        top.addScaledVector(td, -top.dot(td)).normalize();
        out[name + 'Baby'] = +k.toFixed(2);
      }
      if (touch) { T.copy(touch.tip); td.copy(touch.along); top.copy(touch.face); top.addScaledVector(td, -top.dot(td)).normalize(); out[name + 'Touch'] = 1; }
      // EACH JOINT AS A REAL ONE'S (Joshua, 2026-11-04: "her arms at the elbow and wrist... look really uncomfortable"):
      // the elbow a hinge, the forearm's roll and the wrist's bends within a woman's ranges (armJoints.ts,
      // data/jointRange.ts) -- and the hand as near the way asked as they allow. Searched: the way the fingers lie on
      // what the palm is on (turned about the palm's face from the way asked, `K.fingerTurns` -- a hand on a knee
      // turned to point down the thigh needed a wrist bent past what a wrist does), and for each the way round the
      // elbow goes (`K.poleSteps` places round the line from her shoulder to her wrist). The fingertip lands where it
      // was asked; the search keeps last frame's choice and looks round it, and looks at all of it again when the
      // place asked has moved
      const joints = armJointsOf(name, sk, sh, el, wr, h, other);
      const palmWay = top.clone().negate(), outw = S.clone().sub(wp(other)).normalize();
      const E0 = wp(el), a = E0.distanceTo(S), b = wp(wr).distanceTo(E0);
      const keepQ = [sh, el, wr].map((i) => bones[i].quaternion.clone()), reset = () => { [sh, el, wr].forEach((i, k) => bones[i].quaternion.copy(keepQ[k])); bones[sh].updateMatrixWorld(true); };
      let reachShown = -1;
      // (holding a thing, P4: the hand turned about the middle of its palm, which stays on the thing, not its fingertip)
      const pivot = touch?.palm ?? null;
      // (pressing a thing, P4: where her pointing fingertip is from her wrist, as her hand will be when it points -- along
      // her hand, out of her palm and across it, as her hand is now -- so her wrist goes where that puts the tip on it)
      const pressOff = touch?.press ? pointingTipOf(joints, wr) : null;
      let tipAsked = T;
      const place = (fi: number, pi: number) => {
        const yaw = K.fingerTurns[fi] * Math.PI / 180, along = td.clone().applyAxisAngle(top, yaw);
        let W: THREE.Vector3;
        if (pressOff && touch?.press) {
          const across = new THREE.Vector3().crossVectors(along, palmWay);
          W = touch.press.clone().addScaledVector(along, -pressOff.along).addScaledVector(palmWay, -pressOff.palm).addScaledVector(across, -pressOff.across);
          tipAsked = W.clone().addScaledVector(along, handLen);
        } else {
          tipAsked = pivot ? pivot.clone().addScaledVector(along, handLen * BABY_HANDS.palmAt) : T;
          W = tipAsked.clone().addScaledVector(along, -handLen).addScaledVector(top, (touch?.lift ?? K.lift) * perM);
        }
        const SW = W.clone().sub(S);
        let d = SW.length(); reachShown = d / (a + b);
        const most = (a + b) * 0.995; if (d > most) { W.copy(S).addScaledVector(SW.normalize(), most); d = most; }
        const dir = W.clone().sub(S).normalize();
        const base = outw.clone().addScaledVector(H.clone().sub(S).normalize(), 0.6); base.addScaledVector(dir, -base.dot(dir)).normalize();
        const x = (a * a - b * b + d * d) / (2 * d), r = Math.sqrt(Math.max(0, a * a - x * x));
        const pole = base.clone().applyAxisAngle(dir, (2 * Math.PI * pi) / K.poleSteps), E = S.clone().addScaledVector(dir, x).addScaledVector(pole, r);
        const p = joints.pose(E, W, along, palmWay);
        // (an elbow tucked in toward her body, or up, costs as a hand turned that far from the way asked would; and the
        // fingers turned from the way asked a little; and a fingertip that did not get there -- the turn of the hand alone
        // does not see a wrist held short of a place past her reach)
        const miss = wp(h.tip).distanceTo(tipAsked) / perM;
        // (and her arm into her own body, past what her skin gives, as it is posed: ARM_IN_HER)
        let inHer = 0;
        if (torso) {
          const Ew = wp(el), Ww = wp(wr);
          inHer = Math.max(torso.limbIn(S, Ew, AI.upper[0] * perM, AI.upper[1] * perM, AI.upperFrom, 1, AI.points), torso.limbIn(Ew, Ww, AI.fore[0] * perM, AI.fore[1] * perM, 0, AI.foreTo, AI.points)) / perM;
        }
        // (reaching for a thing, P4 -- Joshua, 2026-11-05: "make minimal movements… rotate at shoulder joint forward with
        // slight elbow bend": her elbow kept near where it hangs, down by her side and a little out, each radian it is
        // swung up or round from there costing TOUCH_REACH.elbowLow, as radians of a hand turned do)
        let lowCost = 0;
        if (touch) { const low = H.clone().sub(S).normalize().addScaledVector(outw, TOUCH_REACH.elbowOut); low.addScaledVector(dir, -low.dot(dir)); if (low.lengthSq() > 1e-12) lowCost = TOUCH_REACH.elbowLow * Math.acos(Math.max(-1, Math.min(1, pole.dot(low.normalize())))); }
        return { p, inHer, cost: p.residual + K.tipMiss * miss + AI.weight * Math.max(0, inHer - AI.slack) + K.poleOut * Math.max(0, -pole.dot(outw)) + K.fingerTurnCost * Math.abs(yaw) + (elbowWant ? elbowWant.k * K.elbowWant * (E.distanceTo(elbowWant.at) / perM) : 0) + lowCost };
      };
      const memo = armSearch[name], F = K.fingerTurns.length, NP = K.poleSteps;
      const step = memo ? memo.last.distanceTo(T) : Infinity, again = K.searchAgain * perM;
      const all = !memo || step > again || (step < 0.05 * again && memo.full.distanceTo(T) > again);
      let bestF = memo?.fi ?? 0, bestP = memo?.pi ?? 0, bestCost = Infinity;
      // (holding a thing, P4: its fingers no further turned from the way asked than the thing allows -- round a cup they wrap
      // it; turned down its side, they lay along it)
      const turnsMost = touch?.turnsMost ?? Infinity;
      const tryAt = (fi: number, pi: number) => { if (Math.abs(K.fingerTurns[fi]) > turnsMost) return; reset(); const c = place(fi, pi).cost; if (c < bestCost) { bestCost = c; bestF = fi; bestP = pi; } };
      if (all) { for (let fi = 0; fi < F; fi++) for (let pi = 0; pi < NP; pi++) tryAt(fi, pi); }
      else { const f0 = bestF, p0 = bestP, fp = K.followPoles; for (let df = -1; df <= 1; df++) for (let dp = -fp; dp <= fp; dp++) { const fi = f0 + df; if (fi >= 0 && fi < F) tryAt(fi, (p0 + dp + NP) % NP); } }
      armSearch[name] = { last: T.clone(), full: all ? T.clone() : memo!.full, fi: bestF, pi: bestP };
      reset(); const done = place(bestF, bestP), fin = done.p;
      out[name + 'In'] = Number.isFinite(done.inHer) ? +(done.inHer * 100).toFixed(1) : -99;
      out[name + 'Reach'] = +reachShown.toFixed(3);
      out[name + 'TwistDeg'] = Math.round(fin.residual * 180 / Math.PI);
      out[name + 'ElbowDeg'] = Math.round(fin.elbowDeg); out[name + 'PronDeg'] = Math.round(fin.pronationDeg); out[name + 'WristFlexDeg'] = Math.round(fin.wristFlexDeg); out[name + 'WristRadialDeg'] = Math.round(fin.wristRadialDeg); out[name + 'FingerTurn'] = K.fingerTurns[bestF];
      kneeTips[name] = T.clone();
      // (how far its fingertip is from where it was to go, cm, for the probes)
      out[name] = +(wp(h.tip).distanceTo(tipAsked) / perM * 100).toFixed(1);
    };
    const t1 = performance.now();
    arm(j.shoulderL, j.elbowL, j.wristL, j.hipL, j.kneeL, j.ankleL, j.shoulderR, 'L');
    arm(j.shoulderR, j.elbowR, j.wristR, j.hipR, j.kneeR, j.ankleR, j.shoulderL, 'R');
    out.armsMs = performance.now() - t1;
    // (her fingers closed onto what she holds, or pointing at what she presses: P4)
    gripFingers(); pressFingers(); showFingers();
    // (and every other skeleton of hers -- her body may be drawn by one her clothes and helpers do not share -- given the
    // same turns, bone for bone by name)
    { const moved = [j.shoulderL, j.elbowL, j.wristL, j.shoulderR, j.elbowR, j.wristR].map((i) => bones[i]);
      const seen = new Set<THREE.Skeleton>([sk.skeleton]);
      for (const m of skinned) { if (!m.skeleton || seen.has(m.skeleton)) continue; seen.add(m.skeleton); for (const b of moved) { const o = m.skeleton.bones.find((x) => x.name === b.name); if (o && o !== b) o.quaternion.copy(b.quaternion); } } }
    kneeHold = { L: out.L ?? -1, R: out.R ?? -1, holding: out.L !== undefined && out.R !== undefined, reachL: out.LReach ?? -1, reachR: out.RReach ?? -1, wristTwistL: out.LTwistDeg ?? -1, wristTwistR: out.RTwistDeg ?? -1, elbowL: out.LElbowDeg ?? -1, elbowR: out.RElbowDeg ?? -1, pronL: out.LPronDeg ?? 0, pronR: out.RPronDeg ?? 0, wristFlexL: out.LWristFlexDeg ?? 0, wristFlexR: out.RWristFlexDeg ?? 0, wristRadL: out.LWristRadialDeg ?? 0, wristRadR: out.RWristRadialDeg ?? 0, inL: out.LIn ?? -99, inR: out.RIn ?? -99, contactMs: +(out.contactMs ?? 0).toFixed(2), armsMs: +(out.armsMs ?? 0).toFixed(2), skinSamples: torso?.samples ?? 0 };
  }
  /** Each hand's joints, from her bind: its fingertip (the wrist's furthest descendant), the knuckles, the index and the
   * little finger's first joints, and the sign that turns (knuckles x little-to-index) into the palm (as bindPalm). */
  let handJoints: Array<{ tip: number; knuckles: number[]; index: number; little: number; sign: number } | null> | null = null, handJointsFor: unknown = null;
  function handJointsOf(B: readonly { x: number; y: number; z: number; parent: number }[]): Array<{ tip: number; knuckles: number[]; index: number; little: number; sign: number } | null> {
    if (handJoints && handJointsFor === B) return handJoints;
    handJointsFor = B;
    const kids: number[][] = B.map(() => []); B.forEach((b, i) => { if (b.parent >= 0) kids[b.parent].push(i); });
    const one = (wr: number) => {
      let handAt = -1; const q = [wr]; while (q.length) { const at = q.shift()!; if (kids[at].length >= 4) { handAt = at; break; } q.push(...kids[at]); }
      if (handAt < 0) return null;
      const under = (i: number): boolean => { for (let k = i; k >= 0; k = B[k].parent) if (k === wr) return true; return false; };
      let tip = wr, far = 0; for (let i = 0; i < B.length; i++) if (i !== wr && under(i)) { const dd = Math.hypot(B[i].x - B[wr].x, B[i].y - B[wr].y, B[i].z - B[wr].z); if (dd > far) { far = dd; tip = i; } }
      const bases = kids[handAt].map((k) => kids[k][0] ?? k), c = bases.reduce((acc, b) => [acc[0] + B[b].x / bases.length, acc[1] + B[b].y / bases.length, acc[2] + B[b].z / bases.length], [0, 0, 0]);
      const dist = (a: number, b: { x: number; y: number; z: number }) => Math.hypot(B[a].x - b.x, B[a].y - b.y, B[a].z - b.z);
      const cc = { x: c[0], y: c[1], z: c[2] }, thumb = bases.reduce((best, b) => (dist(b, cc) > dist(best, cc) ? b : best), bases[0]);
      const rest = bases.filter((b) => b !== thumb).sort((a, b) => dist(a, B[thumb]) - dist(b, B[thumb]));
      if (rest.length < 2) return null;
      return { tip, knuckles: [handAt], index: rest[0], little: rest[rest.length - 1], sign: Math.sign(B[wr].x) || 1 };
    };
    handJoints = [one(measure!.joints.wristL), one(measure!.joints.wristR)];
    return handJoints;
  }
  /** Her turns this frame: her pose, or on the way between standing and seated, the two blended (`poseBlend.ts`). */
  function currentTurns(): readonly JointTurn[] {
    // walking, her feet's turns (`stepFeet`)
    if (onStage() && walkFeet?.fresh) return walkFeet.turns;
    if (!sitMoving || sitAmount <= 0 || sitAmount >= 1) return turnsFor();
    return blendJointTurns(turnsFor('stand', standOut), turnsFor('sit', poseOut), sitEase(sitAmount), blendOut);
  }

  /**
   * Her place on the floor. Standing, her build lifts her so her soles stay on the floor (a longer leg, bigger feet).
   * Seated, and on the way there (`sitAmount`), her feet stay where she stood and the stool is set behind her: her hips
   * 10 cm over its top, her ankles a sole's height off the floor, and her ankles' height moved from standing's to
   * seated's as she goes (Joshua, 2026-10-28: a stand-to-sit move, `poseBlend.ts`). The view keeps her where it framed her
   * seated before (`orbit.target.z`). Leaves her bones in this frame's pose.
   */
  function place(): void {
    // walking, she walks the strip, and it is the floor (walkStrip.ts)
    const onStrip = onStage();
    strip.object.visible = onStrip; floor.visible = !onStrip; ring.visible = !onStrip;
    if (!onStrip) balanceDraw.group.visible = false;
    if (onStrip) strip.setWalked(walked);
    if (!model || !rig || !measure) return;
    walkOffset.set(0, 0, 0);
    const skin = findSkinnedMesh(model);
    if (isBirthPose(pose) && skin) { placeBirth(skin); return; }
    model.quaternion.identity();
    if (sitAmount <= 0 || !skin) {
      model.position.set(0, standLift * M, 0);
      model.updateMatrixWorld(true);
      if (onStage() && skin) weighOnFloor(skin);
      stool.visible = false;
      if (!aimHeld) orbit.target.z = ORBIT_START.target.z;
      return;
    }
    const bones = skin.skeleton.bones, j = measure.joints, v = () => new THREE.Vector3();
    // her hips, her feet (between her ankles) and her lower ankle's height in a pose, stood at the origin
    const read = () => {
      model!.position.set(0, 0, 0); model!.updateMatrixWorld(true);
      const al = bones[j.ankleL].getWorldPosition(v()), ar = bones[j.ankleR].getWorldPosition(v());
      return { hips: bones[j.hipL].getWorldPosition(v()).add(bones[j.hipR].getWorldPosition(v())).multiplyScalar(0.5), feet: al.clone().add(ar).multiplyScalar(0.5), low: Math.min(al.y, ar.y) };
    };
    rig.apply(turnsFor('stand', standOut)); const stand = read();
    rig.apply(turnsFor('sit', poseOut)); const sit = read();
    // (in her sneakers, the seat is as high as puts their soles on the floor: her ankles, 8 cm up bare, as high over it as
    // her ankles are over her soles, and the sneakers' soles under them -- at 8 cm their soles were in the floor)
    const shod = sneakersShown() && buildRig ? (buildRig.measure.soleBelowAnkle + sneakers!.lift) * buildAmounts(body, buildRig.measure).feet - 0.08 : 0;
    const seatTop = Math.min(0.55, Math.max(0.4, (sit.hips.y - sit.low) / M + 0.08 - 0.1)) + shod;
    // standing, her feet are here; seated, she is set so they stay there
    const standFeet = stand.feet.clone().add(v().set(0, standLift * M, 0));
    const seatedAt = v().set(standFeet.x - sit.feet.x, (seatTop + 0.1) * M - sit.hips.y, standFeet.z - sit.feet.z);
    // this frame's pose, and her set so her feet are where she stood, at the height they have come to
    rig.apply(currentTurns()); handsOnKnees(); garmentRoom?.applyPose();
    const now = read(), e = sitEase(sitAmount);
    const lowStanding = stand.low + standLift * M, lowSeated = sit.low + seatedAt.y, low = lowStanding + (lowSeated - lowStanding) * e;
    model.position.set(standFeet.x - now.feet.x, low - now.low, standFeet.z - now.feet.z);
    model.updateMatrixWorld(true);
    stool.visible = true;
    stool.scale.set(1, seatTop * M, 1);
    stool.position.set(seatedAt.x + sit.hips.x, (seatTop * M) / 2, seatedAt.z + sit.hips.z - 0.02 * M);
    // seated she used to be set with her hips 4 cm behind the room's middle: the view follows her back to frame her so
    orbit.target.z = ORBIT_START.target.z + (model.position.z + now.hips.z - (stand.hips.z + (-0.04 * M - stand.hips.z) * e));
  }

  /**
   * WALKING WITH WEIGHT, ON HER OWN FEET (Joshua, 2026-11-08: "the body has no natural weight and bounce while walking";
   * then "let the model actually walk and move from her legs vs just animation... could create a 5x10 meter walking
   * strip"; Trello #273, step 2). She walks the strip (walkStrip.ts) for real, `walked` metres along it: her pose is the
   * walk with its weight on it (`walkWeight`: her hips list and twist, her body over the foot she stands on), and then her
   * FEET drive her (actor/humanFeet.ts, #233) -- each planted foot holds the strip where it landed and turns flat, a
   * trailing heel rises onto its ball, and her body comes down only as far as her legs need it to, which is the walk's
   * rise and fall. Her WALK bob keeps a share of that (`bobDrop`) and her knees take up the rest (`bendKnees`).
   *
   * The feet work in the strip's own frame, on a bind read off her bones as they are drawn (her build's lengths, her
   * feet's size, her sneakers' soles on the floor); she is drawn where she stands and the strip moves under her. What
   * the walk moved her by is kept in `walkOffset`: her soft parts feel her motion without it, as they did before, the
   * walk's bounce already fed to them (`walkBounceAccel`, tuned by Joshua 2026-10-08).
   */
  interface WalkFeet {
    readonly key: string;
    /** Her bind as her bones are drawn, bind units, the floor at y 0 (her sneakers' soles on it when she wears them). */
    readonly bind: readonly BindJoint[];
    /** Bind units to the metre (`HumanRig.bindScale`). */
    readonly upm: number;
    /** Her leg, hip to ankle standing, metres. */
    readonly leg: number;
    state: FeetState;
    readonly out: MutableJointTurn[];
    /** This frame's pose with her feet on it: what `currentTurns` hands out while she walks. */
    readonly turns: MutableJointTurn[];
    /** Whether `turns` is this frame's (it is not once she has left the stage since). */
    fresh: boolean;
    /** The pose her feet were set down for: another sets them down afresh. */
    pose: SarahLabPose;
    /** Her body over the foot she stands on (world x, metres) and how far her feet brought her down (metres). */
    x: number;
    drop: number;
    /** How far her feet brought her down, by where in her stride (BOB_BINS of it): her rise and fall, for her bob. */
    readonly bins: Float64Array;
    /** Each foot's sole as drawn -- her shoe's, or her foot's barefoot -- as its lowest points along it and across it
     * (`SOLE_POINTS` by `SOLE_ACROSS`), and the height the lowest of them stands at in her bind (room units): a sole is on
     * the floor there. */
    /** Each sole's points read every frame, the floor under them as she stands in her bind, and how high over it each
     * point stood there (`clear`, world units: what is up off the floor when she stands flat, an arch or a toe's spring). */
    readonly soles: readonly { readonly mesh: THREE.SkinnedMesh; readonly verts: Uint32Array; readonly floor: number; readonly clear: Float32Array }[];
  }
  /** Her stride's rise and fall is remembered a 24th of a stride at a time. GAME TUNING. */
  const BOB_BINS = 24;
  /**
   * THE SLOPE (Joshua, 2026-11-08: "test on different gradient like flat floor at 0, 30 straight ahead, and walking
   * (standing first) parallel to that angle to see how it deals with bending like the knees on the higher side and
   * extending the opposite"): the treadmill tilted under STAND and WALK (walkStrip.ts). Her feet stand on the plane it
   * makes, each planted foot turned onto it as far as her ankle goes (humanFeet.ts `FootConform`), and no further: past
   * that she stands on an edge of her foot -- on a slope too steep to walk heel first, on her toes ("most people... if
   * it's too steep to walk (heel > toe), is just toe-to-toe").
   */
  /** Whether she is on the treadmill: walking, or standing on its slope. */
  function onStage(): boolean { return pose === 'walk' || (pose === 'stand' && (slope.deg !== 0 || balanceOn)); }
  /** The stage's ground under (x, z) of the strip's frame, metres: a plane through where she started. */
  function stageY(x: number, z: number): number { const g = slopeGrade(slope, measure?.leftSign ?? 1); return g.x * x + g.z * z; }
  /**
   * How far a planted foot turns onto the slope, from the master table (data/jointRange.ts): standing, her weight takes
   * her ankle as far as it goes under load (the passive wall); walking, only as far as it bends by itself (active).
   */
  function conformFor(walking: boolean): FootConform {
    const r = (m: 'dorsiflexion' | 'plantarflexion' | 'inversion' | 'eversion', level: RangeLevel) => rangeDeg('ankle', m, 'female', level) * THREE.MathUtils.DEG2RAD;
    const level: RangeLevel = walking ? 'active' : 'passive';
    return { dorsiflexion: r('dorsiflexion', level), plantarflexion: r('plantarflexion', level), inversion: r('inversion', level), eversion: r('eversion', level) };
  }
  /**
   * BALANCE TEST (Trello #273 step 3b: "measure support polygon (planted sole contacts), projected centre of mass...
   * Show telemetry, no giant permanent HUD"). On the treadmill, each frame: her centre of mass from her bones as drawn
   * and her pregnancy's weight at her week (actor/bodyMass.ts), the outline round the points of her soles that touch
   * the floor (`WalkFeet.soles`, BALANCE_TOUCH and BALANCE_SETTLE), and how far inside it her centre
   * of mass falls straight down -- or, moving, where it is heading (Hof's extrapolated centre of mass: where she must
   * have a foot to stop). Walking, it is heading past the foot she stands on for most of every step, as anyone's is: the
   * next foot catches it, and how far inside her feet it was as that foot came down is what the line reads. Drawn, when
   * asked for, as an instrument -- the outline on the floor, a plumb line from her centre of mass and a line on to where
   * it is heading, green with room to spare, amber near the edge, red past it -- through her, as the finder is drawn in
   * TRADDOMIUM.
   */
  /** A sole's point is on the floor within this of it, metres. GAME TUNING: a sole is read every 2 cm, so rocked onto its
   * ball the point nearest the floor can be most of a centimetre off it. */
  const BALANCE_TOUCH = 0.01;
  /** ...or within this of where it stood on it in her bind (a point that stood off it there, as the skeleton's heel bone
   * does), metres. GAME TUNING: no more, or a foot swinging past the floor would be read as on it. */
  const BALANCE_SETTLE = 0.003;
  /** The points of a sole that bear her weight when she stands flat: up to this high over the floor in her bind, metres.
   * GAME TUNING: a shoe's sole and a foot's heel and ball pads -- and the skeleton's heel bone, held up off the floor by
   * the 1-2 cm heel pad it does not have -- but not an arch. */
  const BALANCE_BEARING = 0.02;
  /** Her centre of mass's speed is smoothed over this long, seconds: a frame's jitter is not a lurch. GAME TUNING. */
  const BALANCE_SPEED_EASE = 0.08;
  /** Slower than this (m/s) she is standing still, as the line reads it. GAME TUNING. */
  const BALANCE_MOVING = 0.05;
  /** The margin under which she is near her edge, metres. GAME TUNING. */
  const BALANCE_NEAR = 0.03;
  const balanceDraw = (() => {
    const group = new THREE.Group(); group.visible = false; group.renderOrder = 999;
    const line = (n: number) => new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const mat = () => new THREE.LineBasicMaterial({ color: 0x2fbf71, depthTest: false, transparent: true });
    const outline = new THREE.LineLoop(line(256), mat()), plumb = new THREE.Line(line(2), mat()), ahead = new THREE.Line(line(2), mat());
    const dot = (r: number) => new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), new THREE.MeshBasicMaterial({ color: 0x2fbf71, depthTest: false, transparent: true }));
    const com = dot(0.012 * M), foot = dot(0.008 * M), heading = dot(0.01 * M);
    // (and the ground inside the outline, shaded: a fan from its middle, as the outline is convex)
    const fillGeometry = line(257);
    fillGeometry.setIndex(new THREE.BufferAttribute(new Uint16Array(3 * 256), 1));
    const fill = new THREE.Mesh(fillGeometry, new THREE.MeshBasicMaterial({ color: 0x2fbf71, depthTest: false, transparent: true, opacity: 0.28, side: THREE.DoubleSide }));
    for (const o of [fill, outline, plumb, ahead, com, foot, heading]) { o.renderOrder = 999; o.frustumCulled = false; group.add(o); }
    three.add(group);
    return { group, fill, outline, plumb, ahead, com, foot, heading };
  })();
  /** Her body as her bones are drawn now, as points (metres), her pregnancy's weight and where it is, and the joint her
   * trunk leans about (her lower back: the rig's `spine`). */
  function herBody(sk: THREE.SkinnedMesh, f: WalkFeet): { body: BodyPoints; womb: P3; kg: number; pivot: P3 } | null {
    if (!measure || !rig) return null;
    const bones = sk.skeleton.bones, j = measure.joints, v = new THREE.Vector3();
    const at = (i: number): P3 => { bones[i].getWorldPosition(v); return [v.x / M, v.y / M, v.z / M]; };
    const child = (i: number) => rig!.bind.findIndex((b) => b.parent === i);
    const past = (a: P3, b: P3, m: number): P3 => { const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1; return [b[0] + ((b[0] - a[0]) / d) * m, b[1] + ((b[1] - a[1]) / d) * m, b[2] + ((b[2] - a[2]) / d) * m]; };
    const head = at(j.head), neck = at(j.neck), top = child(j.head) >= 0 ? at(child(j.head)) : past(neck, head, 0.12);
    const limb = (l: number, r: number) => [at(l), at(r)] as const;
    const wrist = limb(j.wristL, j.wristR), elbow = limb(j.elbowL, j.elbowR), ankle = limb(j.ankleL, j.ankleR);
    // a hand's middle (the third knuckle) 9 cm on from the wrist; a foot's heel under and behind the ankle, its toe its tip
    const toe = f.state.legs.map((leg) => { const e = leg.ball >= 0 ? child(leg.ball) : -1; return e >= 0 ? at(e) : leg.ball >= 0 ? at(leg.ball) : at(leg.ankle); }) as unknown as [P3, P3];
    const heel = ankle.map((a, k) => [a[0] - (toe[k][0] - a[0]) * 0.3, a[1] - 0.08, a[2] - (toe[k][2] - a[2]) * 0.3] as P3) as unknown as [P3, P3];
    const hipL = at(j.hipL), hipR = at(j.hipR), mid: P3 = [(hipL[0] + hipR[0]) / 2, (hipL[1] + hipR[1]) / 2, (hipL[2] + hipR[2]) / 2];
    const week = pregnant() ? herWeek(bump, babyCount, pregnancy) : 0, kg = wombKg(week), place = wombPlace(week);
    // (the womb's weight where her baby's womb is, once it is laid out in her; till then where a womb that size sits)
    const womb: P3 = babyWomb && babyHolder ? (() => { const c = babyHolder.localToWorld(babyWomb.centre.clone()); return [c.x / M, c.y / M, c.z / M] as P3; })() : [mid[0], mid[1] + place.up, mid[2] + place.forward];
    const body: BodyPoints = {
      headTop: top, neck, hipL, hipR, shoulder: limb(j.shoulderL, j.shoulderR), elbow, wrist, handEnd: [past(elbow[0], wrist[0], 0.09), past(elbow[1], wrist[1], 0.09)],
      knee: limb(j.kneeL, j.kneeR), ankle, heel, toe,
    };
    return { body, womb, kg, pivot: at(j.spine) };
  }
  function measureBalance(sk: THREE.SkinnedMesh, f: WalkFeet): void {
    const her = herBody(sk, f);
    if (!her || !measure) return;
    const { body, womb, kg } = her, v = new THREE.Vector3();
    const com = centreOfMass(body, BODY_KG, kg > 0 ? [{ kg, at: womb }] : []);
    // what holds her up: the points of her soles that bear her weight standing flat, wherever they are back on the floor
    // as they stood on it (over it along its normal, less their own height over it in her bind)
    const touching: P2[] = [], g = slopeGrade(slope, measure.leftSign), across = Math.hypot(1, g.x, g.z), down = [false, false];
    const contact: P2[][] = [[], []], print: P2[][] = [[], []];
    f.soles.forEach((sole, k) => sole.verts.forEach((i, n) => {
      if (sole.clear[n] > BALANCE_BEARING * M) return;
      sole.mesh.getVertexPosition(i, v); sole.mesh.localToWorld(v);
      const q: P2 = [v.x / M, v.z / M];
      print[k].push(q);
      // on the floor: within BALANCE_TOUCH of it, or within BALANCE_SETTLE of where it stood on it in her bind
      const over = (v.y - stageY(q[0], q[1]) * M - sole.floor) / across;
      if (over <= Math.max(BALANCE_TOUCH * M, sole.clear[n] + BALANCE_SETTLE * M)) { touching.push(q); contact[k].push(q); down[k] = true; }
    }));
    // and where it is heading: its speed along the strip, smoothed over BALANCE_SPEED_EASE, carried on (bodyMass.ts)
    const zAlong = com[2] + walked, was = balanceWas, dt = was ? stageClock - was.t : 0;
    let vx = was?.vx ?? 0, vz = was?.vz ?? 0;
    if (!was || dt > 0.5) { vx = 0; vz = 0; } else if (dt > 1e-4) { const k = 1 - Math.exp(-dt / BALANCE_SPEED_EASE); vx += ((com[0] - was.x) / dt - vx) * k; vz += ((zAlong - was.z) / dt - vz) * k; }
    if (!was || dt > 1e-4) balanceWas = { t: stageClock, x: com[0], z: zAlong, vx, vz };
    const heading = extrapolatedCom([com[0], com[2]], [vx, vz], com[1] - stageY(com[0], com[2]));
    const outline = supportOutline(touching), edge = balanceAt(outline, heading), margin = edge.margin;
    // walking, her balance is caught step by step: as each foot comes down, how far inside her feet it is heading -- the
    // ground the step gives her, all of that foot's sole where it lands (it comes down on its heel and rolls flat) and
    // what the other foot still stands on (Hof's margin of stability at foot contact) -- kept till the next step
    const landed = balanceDown ? down.map((d, k) => d && !balanceDown![k]) : [false, false];
    if (landed.some(Boolean) && Math.hypot(vx, vz) >= BALANCE_MOVING) {
      const given = supportOutline([0, 1].flatMap((k) => (landed[k] ? print[k] : contact[k]))), caught = balanceAt(given, heading);
      balanceStep = { margin: caught.margin, nearest: caught.nearest, heading, given, com: [com[0], com[2]] };
    }
    balanceDown = down;
    stageBalance = { com, heading, speed: Math.hypot(vx, vz), outline, margin, nearest: edge.nearest, kg, body, womb };
    const field = fields[SARAH_LAB_FIELD.balance], text = balanceLine();
    if (field && field.textContent !== text) field.textContent = text;
    // drawn
    // (coloured, walking, by how her last step caught her)
    const judged = Math.hypot(vx, vz) >= BALANCE_MOVING && balanceStep ? balanceStep.margin : margin;
    const d = balanceDraw, colour = judged >= BALANCE_NEAR ? 0x2fbf71 : judged >= 0 ? 0xf0a020 : 0xe5484d;
    d.group.visible = balanceOn;
    if (!balanceOn) return;
    for (const o of [d.fill, d.outline, d.plumb, d.ahead, d.com, d.foot, d.heading]) (o.material as THREE.LineBasicMaterial | THREE.MeshBasicMaterial).color.setHex(colour);
    const ring = d.outline.geometry.getAttribute('position') as THREE.BufferAttribute, n = Math.min(outline.length, ring.count);
    outline.slice(0, n).forEach((q, k) => ring.setXYZ(k, q[0] * M, (stageY(q[0], q[1]) + 0.003) * M, q[1] * M));
    ring.needsUpdate = true; d.outline.geometry.setDrawRange(0, n);
    const filled = d.fill.geometry.getAttribute('position') as THREE.BufferAttribute;
    let mx = 0, mz = 0; for (let k = 0; k < n; k++) { mx += outline[k][0] / n; mz += outline[k][1] / n; }
    filled.setXYZ(0, mx * M, (stageY(mx, mz) + 0.002) * M, mz * M);
    for (let k = 0; k < n; k++) filled.setXYZ(k + 1, ring.getX(k), ring.getY(k) - 0.001 * M, ring.getZ(k));
    filled.needsUpdate = true;
    // (a fan round it, its last triangle closing on its first point)
    const fan = d.fill.geometry.getIndex()!, tri = fan.array as Uint16Array | Uint32Array;
    for (let k = 0; k < n; k++) { tri[3 * k] = 0; tri[3 * k + 1] = k + 1; tri[3 * k + 2] = ((k + 1) % n) + 1; }
    fan.needsUpdate = true; d.fill.geometry.setDrawRange(0, n >= 3 ? 3 * n : 0);
    const floorY = stageY(com[0], com[2]);
    const plumb = d.plumb.geometry.getAttribute('position') as THREE.BufferAttribute;
    plumb.setXYZ(0, com[0] * M, com[1] * M, com[2] * M); plumb.setXYZ(1, com[0] * M, (floorY + 0.003) * M, com[2] * M); plumb.needsUpdate = true;
    d.com.position.set(com[0] * M, com[1] * M, com[2] * M);
    d.foot.position.set(com[0] * M, (floorY + 0.003) * M, com[2] * M);
    // where it is heading, on the floor, once that is a centimetre on from it
    const moving = Math.hypot(heading[0] - com[0], heading[1] - com[2]) > 0.01, aheadY = (stageY(heading[0], heading[1]) + 0.003) * M;
    d.ahead.visible = d.heading.visible = moving;
    const line2 = d.ahead.geometry.getAttribute('position') as THREE.BufferAttribute;
    line2.setXYZ(0, com[0] * M, (floorY + 0.003) * M, com[2] * M); line2.setXYZ(1, heading[0] * M, aheadY, heading[1] * M); line2.needsUpdate = true;
    d.heading.position.set(heading[0] * M, aheadY, heading[1] * M);
  }
  /** The BALANCE line. */
  function balanceLine(): string {
    if (!balanceOn) return 'BALANCE TEST · off';
    const b = stageBalance;
    if (!b || !onStage()) return 'BALANCE TEST · on the treadmill (STAND or WALK)';
    const cm = Math.abs(b.margin * 100).toFixed(1), carrying = b.kg > 0.05 ? ` · carrying ${b.kg.toFixed(1)} kg` : '';
    // which way past her feet, in her own frame: ahead, behind, to her left or right
    const way = (m: { heading: P2; nearest: P2 | null }) => {
      if (!m.nearest) return '';
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(model?.quaternion ?? new THREE.Quaternion()), dx = m.heading[0] - m.nearest[0], dz = m.heading[1] - m.nearest[1];
      const along = dx * fwd.x + dz * fwd.z, side = (dx * fwd.z - dz * fwd.x) * (measure?.leftSign ?? 1);
      return `, ${Math.abs(along) >= Math.abs(side) ? (along > 0 ? 'ahead' : 'behind') : side > 0 ? 'to her left' : 'to her right'}`;
    };
    if (b.speed >= BALANCE_MOVING) {
      const s = balanceStep, moving = `moving ${b.speed.toFixed(1)} m/s`;
      if (!s || !Number.isFinite(s.margin)) return `BALANCE · ${moving}${carrying}`;
      const by = Math.abs(s.margin * 100).toFixed(1);
      return `BALANCE · ${moving} · her last step caught her ${s.margin >= 0 ? `${by} cm inside her feet` : `${by} cm short${way(s)}`}${carrying}`;
    }
    if (!Number.isFinite(b.margin)) return 'BALANCE · no foot on the floor';
    return b.margin >= 0 ? `BALANCE · ${cm} cm inside her feet${carrying}` : `BALANCE · ${cm} cm past her feet${way(b)}${carrying}`;
  }
  function setBalance(on: boolean): void { balanceOn = on; if (!on) { balanceDraw.group.visible = false; stageBalance = null; } refresh(); place(); }
  function setSlope(deg: number, heading: SlopeHeading): void {
    const was = slope;
    slope = { deg: Math.max(-SLOPE.most, Math.min(SLOPE.most, Math.round(deg))), heading };
    strip.setSlope(slope, measure?.leftSign ?? 1);
    // a new slope sets her feet down afresh on it: feet held where the old one had them would float over it or sink in
    // (seen standing, 2026-11-08: the slope tilted from 10 to 20 degrees uphill under her, her heels were held off it)
    if (walkFeet && (was.deg !== slope.deg || was.heading !== slope.heading)) { walkFeet.fresh = false; if (onStage()) stepFeet(0); }
    refresh(); place();
  }
  /** Her feet, for this body, build and lift; worked out again when any of them changes. Leaves her bones in her bind. */
  function feetFor(sk: THREE.SkinnedMesh): WalkFeet | null {
    if (!model || !rig || !measure) return null;
    const shod = sneakersShown() && sneakers ? sneakers : null;
    const key = `${model.uuid}|${bonesBuilt}|${standLift.toFixed(5)}|${shod ? shod.meshes.map((m) => m.uuid).join() : 'bare'}`;
    if (walkFeet?.key === key) return walkFeet;
    // her bones as drawn in her bind pose, stood on the floor as she stands: room units, bind units, metres
    const bones = sk.skeleton.bones, upm = rig.bindScale, perUnit = M / upm, p = new THREE.Vector3(), j = measure.joints;
    model.position.set(0, standLift * M, 0); model.quaternion.identity();
    rig.apply([]); model.updateMatrixWorld(true);
    const bind = rig.bind.map((b, i) => { bones[i].getWorldPosition(p); return { ...b, x: p.x / perUnit, y: p.y / perUnit, z: p.z / perUnit }; });
    const leg = Math.hypot(bind[j.hipL].x - bind[j.ankleL].x, bind[j.hipL].y - bind[j.ankleL].y, bind[j.hipL].z - bind[j.ankleL].z) / upm;
    // each sole's lowest points along its length and across it, read in her bind as she stands on the floor
    const soles = [j.ankleL, j.ankleR].map((ankle, k) => {
      const mesh = shod?.meshes[k] ?? sk, all = shod ? null : footVerts(sk, ankle), n = all ? all.length : mesh.geometry.getAttribute('position').count;
      const pts: { i: number; x: number; y: number; z: number }[] = [];
      for (let m = 0; m < n; m++) { const i = all ? all[m] : m; mesh.getVertexPosition(i, p); mesh.localToWorld(p); pts.push({ i, x: p.x, y: p.y, z: p.z }); }
      const low = Math.min(...pts.map((q) => q.y)), bottom = pts.filter((q) => q.y < low + SOLE_DEPTH * M);
      const span = (v: (q: { x: number; z: number }) => number) => { const a = Math.min(...bottom.map(v)), b = Math.max(...bottom.map(v)); return (q: { x: number; z: number }) => (v(q) - a) / Math.max(1e-6, b - a); };
      const along = span((q) => q.z), across = span((q) => q.x), best: ({ i: number; y: number } | null)[] = Array(SOLE_POINTS * SOLE_ACROSS).fill(null);
      // (and the tip and the back of each width: on a slope rising ahead, the tip of a shoe meets it first)
      const tips: ({ i: number; z: number } | null)[] = Array(2 * SOLE_ACROSS).fill(null);
      for (const q of bottom) {
        const w = Math.min(SOLE_ACROSS - 1, Math.floor(across(q) * SOLE_ACROSS)), b = Math.min(SOLE_POINTS - 1, Math.floor(along(q) * SOLE_POINTS)) * SOLE_ACROSS + w;
        if (!best[b] || q.y < best[b]!.y) best[b] = q;
        if (!tips[2 * w] || q.z > tips[2 * w]!.z) tips[2 * w] = q;
        if (!tips[2 * w + 1] || q.z < tips[2 * w + 1]!.z) tips[2 * w + 1] = q;
      }
      const kept = [...new Map([...best, ...tips].filter((q) => q !== null).map((q) => [q!.i, q!])).values()] as { i: number; y: number }[];
      return { mesh, verts: Uint32Array.from(kept.map((q) => q.i)), floor: low, clear: Float32Array.from(kept.map((q) => q.y - low)) };
    });
    walkFeet = { key, bind, upm, leg, state: createFeet(measure, bind, 0), out: [], turns: [], fresh: false, pose, x: 0, drop: 0, bins: new Float64Array(BOB_BINS).fill(NaN), soles };
    return walkFeet;
  }
  /** Each sole is read as its lowest point in this many lengths of it, heel to toe, from the part of it within SOLE_DEPTH
   * (metres) of its bottom. GAME TUNING: a point every 2 cm of a shoe, cheap to follow every frame. */
  const SOLE_POINTS = 12;
  const SOLE_DEPTH = 0.03;
  /** ...and in this many widths of it, inner edge to outer, so a foot rolled on a slope is read at its edges. */
  const SOLE_ACROSS = 3;
  /** A step of her walk on her feet (`advance`, before her pose is laid on her bones). */
  function stepFeet(dt: number): void {
    stageClock += Math.max(0, dt);
    const sk = bodyOf()?.mesh ?? (model ? findSkinnedMesh(model) : null);
    if (!sk || !rig || !measure) return;
    const f = feetFor(sk);
    if (!f) return;
    // a new walk, or standing, sets her feet down afresh, wherever she is along the strip
    if (!f.fresh || f.pose !== pose) { f.state = createFeet(measure, f.bind, 0); f.bins.fill(NaN); f.pose = pose; balanceWas = null; balanceDown = null; balanceStep = null; }
    const walking = pose === 'walk', phase = walkPhase(), left = measure.leftSign < 0 ? -1 : 1;
    f.state.conform = conformFor(walking);
    f.x = walking ? left * weightAt(phase).sway * f.leg : 0;
    const [nx, ny, nz] = slopeNormal(slope, measure.leftSign), under = { y: 0, grip: 1, nx, ny, nz };
    const fed = groundFeet(f.state, measure, f.bind, turnsFor(walking ? 'walk' : 'stand', poseOut), {
      dt, released: false, rootX: f.x, rootY: stageY(f.x, walked), rootZ: walked, rootYaw: 0, unitsPerMetre: f.upm,
      groundAt: (x, z) => ((under.y = stageY(x, z)), under),
    }, f.out);
    while (f.turns.length < fed.turns.length) f.turns.push(newJointTurn());
    f.turns.length = fed.turns.length;
    fed.turns.forEach((t, i) => { const o = f.turns[i]; o.joint = t.joint; o.ax = t.ax; o.ay = t.ay; o.az = t.az; o.radians = t.radians; });
    f.drop = fed.rootDrop;
    if (walking) f.bins[Math.min(BOB_BINS - 1, Math.floor(phase * BOB_BINS))] = f.drop;
    f.fresh = true;
  }
  /** The most and least her feet have brought her down through her stride (metres), or null before she has walked. */
  function bobRange(): { most: number; least: number } | null {
    const f = walkFeet;
    if (!f?.fresh) return null;
    let most = -Infinity, least = Infinity;
    for (const d of f.bins) if (Number.isFinite(d)) { most = Math.max(most, d); least = Math.min(least, d); }
    return Number.isFinite(most) ? { most, least } : null;
  }
  function weighOnFloor(skin: THREE.SkinnedMesh): void {
    if (!model || !measure) return;
    // (placed again with no new pose since: her knees as her pose had them, not as they were bent)
    unbendKnees();
    const f = walkFeet;
    if (!f?.fresh) return;
    // her WALK bob's share of her rise and fall: she keeps her lowest, and comes that share of the way up from it
    const range = pose === 'walk' ? bobRange() : null, extra = range ? bobDrop(-f.drop, -range.most, body.walkBob / 100) : 0;
    // (drawn where she stands: the strip's ground under her root, against its ground under where she started)
    walkOffset.set(f.x * M, (stageY(f.x, walked) - stageY(0, walked) - f.drop - extra) * M, 0);
    model.position.add(walkOffset); model.updateMatrixWorld(true);
    const sk = bodyOf()?.mesh ?? skin;
    bendKnees(sk, extra * M);
    keepLevel(sk, f);
    flatToes(sk, f);
    keepSoles(sk, f);
    if (balanceOn) measureBalance(sk, f);
  }

  /**
   * HER BODY KEPT LEVEL (Trello #273 step 3c; Joshua, 2026-11-08: "automatic body tilt to keep a level body even if it
   * means like the torso tilts back, hips forward slightly"). On the treadmill, standing or walking: her balance kept
   * over the same part of her soles on any slope, and taken back from her pregnancy's pull (actor/levelBody.ts) -- her
   * hips moved over her planted feet, her legs reaching back to them (`bendLegs`), and her trunk leaned about her lower
   * back, her head and neck turned back level. Worked out each frame from her body as her pose and her feet have it, and
   * eased into (LEVEL.ease) so a slope or a pregnancy changed under her is leaned into. Her LEAN slider scales it.
   */
  let level: Level = LEVEL_NONE, levelWant: Level = LEVEL_NONE, levelAt = -Infinity;
  function keepLevel(sk: THREE.SkinnedMesh, f: WalkFeet): void {
    if (!model || !measure) return;
    const her = herBody(sk, f);
    if (!her) return;
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(model.quaternion).setY(0).normalize();
    const g = slopeGrade(slope, measure.leftSign), j = measure.joints;
    levelWant = levelBody({
      body: her.body, womb: her.kg > 0 ? { kg: her.kg, at: her.womb } : null, pivot: her.pivot, forward: [fwd.x, fwd.z],
      slopeDeg: (Math.atan(g.x * fwd.x + g.z * fwd.z) * 180) / Math.PI,
      ankleHeight: (f.bind[j.ankleL].y + f.bind[j.ankleR].y) / 2 / f.upm, amount: body.walkLean / 100,
    });
    // (back on the treadmill after a while off it: from upright)
    const gap = stageClock - levelAt;
    level = gap > 0.5 ? LEVEL_NONE : easeLevel(level, levelWant, gap);
    levelAt = stageClock;
    layLevel(sk, level);
    // (its line, live)
    const line = fields[`${SARAH_LAB_FIELD.body}walkLean`], text = controlLine('walkLean', body.walkLean) + walkNote('walkLean');
    if (line && line.textContent !== text) line.textContent = text;
  }
  function layLevel(sk: THREE.SkinnedMesh, l: Level): void {
    if (!model || !measure) return;
    // her hips over her feet, and down: her legs reach back to where her feet were
    const shift = new THREE.Vector3(l.hips[0] * M, -l.sit * M, l.hips[1] * M);
    if (shift.lengthSq() > 1e-10) {
      model.position.add(shift); walkOffset.add(shift); model.updateMatrixWorld(true);
      bendLegs(sk, [l.sit * M, l.sit * M], [-shift.x, -shift.z]);
    }
    // her trunk leaned about her lower back, her neck turned back by as much so her head stays level
    const angle = Math.hypot(l.lean[0], l.lean[1]), bones = sk.skeleton.bones, spine = bones[measure.joints.spine], neck = bones[measure.joints.neck];
    if (angle < 1e-6 || !spine?.parent || !neck?.parent) return;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(l.lean[1] / angle, 0, -l.lean[0] / angle), angle);
    const wq = (b: THREE.Object3D) => b.getWorldQuaternion(new THREE.Quaternion());
    const turnWorld = (b: THREE.Object3D, r: THREE.Quaternion) => { b.quaternion.copy(wq(b.parent!).invert().multiply(r).multiply(wq(b))); b.updateMatrixWorld(true); };
    const pre = [spine.quaternion.clone(), neck.quaternion.clone()];
    turnWorld(spine, q); turnWorld(neck, q.clone().invert());
    bent.push({ bones: [spine, neck], pre, post: [spine.quaternion.clone(), neck.quaternion.clone()] });
  }

  /**
   * HER KNEES TAKE UP WHAT HER BOB LEAVES OUT (Joshua, 2026-11-08: "Half the movement... add a slider so I can tweak the
   * up/down (bob)"). Her body has come down `drop` (world units) from where her legs put her; each foot is raised back
   * by as much, so it stays exactly where it was -- on the floor, or clearing it in its swing -- and the leg's two bones
   * reach it: the knee in the plane it already bends in (forward, never back), the thigh turned the shortest way to its
   * new knee, the shin likewise, the foot left turned as it was. Over her bones as drawn, so her build's lengths count.
   * What it wrote is kept, so a second placing with no new pose since starts again from her pose (`unbendKnees`).
   */
  const bent: { bones: THREE.Object3D[]; pre: THREE.Quaternion[]; post: THREE.Quaternion[] }[] = [];
  function unbendKnees(): void {
    let undone = false;
    for (let n = bent.length - 1; n >= 0; n--) {
      const k = bent[n];
      if (!k.bones.every((b, i) => b.quaternion.angleTo(k.post[i]) < 1e-6)) continue;
      k.bones.forEach((b, i) => b.quaternion.copy(k.pre[i])); undone = true;
    }
    bent.length = 0;
    if (undone) model?.updateMatrixWorld(true);
  }
  /** The knee's own bend leans forward by this share of the thigh, so a straight leg still bends the way a knee does.
   * BIOLOGICAL SHAPE (a knee is a forward hinge), the share humanFeet.ts uses (`POLE_FORWARD_FRAC`). */
  const KNEE_FORWARD = 0.05;
  function bendKnees(sk: THREE.SkinnedMesh, drop: number): void { bendLegs(sk, [drop, drop]); }
  /** Each foot raised by its own `lift` and moved by `shift` (x, z) (world units) from where its leg had it, its leg bent
   * to reach it (`bendKnees`; `layLevel` moves her hips over her feet and takes her feet back with this). */
  function bendLegs(sk: THREE.SkinnedMesh, lift: readonly [number, number], shift: readonly [number, number] = [0, 0]): void {
    const moved = Math.hypot(shift[0], shift[1]) > 1e-6;
    if (!model || !measure || !(lift[0] > 1e-6 || lift[1] > 1e-6 || moved)) return;
    const bones = sk.skeleton.bones, j = measure.joints, list: THREE.Object3D[] = [], pre: THREE.Quaternion[] = [];
    const wp = (b: THREE.Object3D) => b.getWorldPosition(new THREE.Vector3()), wq = (b: THREE.Object3D) => b.getWorldQuaternion(new THREE.Quaternion());
    // a bone turned about its own joint by a turn in the world
    const turnWorld = (b: THREE.Object3D, q: THREE.Quaternion) => { b.quaternion.copy(wq(b.parent!).invert().multiply(q).multiply(wq(b))); b.updateMatrixWorld(true); };
    // her forward (both bodies face +Z bound; the room turns her about the vertical only)
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(wq(model));
    for (const [hi, ki, ai, side] of [[j.hipL, j.kneeL, j.ankleL, 0], [j.hipR, j.kneeR, j.ankleR, 1]]) {
      const hb = bones[hi], kb = bones[ki], ab = bones[ai], drop = lift[side];
      if (!(drop > 1e-6 || moved) || !hb?.parent || kb?.parent !== hb || ab?.parent !== kb) continue;
      list.push(hb, kb, ab); pre.push(hb.quaternion.clone(), kb.quaternion.clone(), ab.quaternion.clone());
      const H = wp(hb), K = wp(kb), A = wp(ab), foot = wq(ab), T = new THREE.Vector3(A.x + shift[0], A.y + Math.max(0, drop), A.z + shift[1]);
      const l1 = K.distanceTo(H), l2 = A.distanceTo(K);
      const D = Math.min(l1 + l2 - 1e-6, Math.max(Math.abs(l1 - l2) + 1e-6, T.distanceTo(H)));
      const u = T.clone().sub(H).normalize();
      // the plane her knee bends in: as posed, any backward part taken out, a little forward added
      const v = K.clone().sub(H); v.addScaledVector(u, -v.dot(u));
      const f = fwd.clone().addScaledVector(u, -fwd.dot(u)).normalize();
      if (v.dot(f) < 0) v.addScaledVector(f, -v.dot(f));
      v.addScaledVector(f, KNEE_FORWARD * l1).normalize();
      const a = (l1 * l1 - l2 * l2 + D * D) / (2 * D), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
      const K2 = H.clone().addScaledVector(u, a).addScaledVector(v, h);
      turnWorld(hb, new THREE.Quaternion().setFromUnitVectors(K.clone().sub(H).normalize(), K2.sub(H).normalize()));
      const K1 = wp(kb), A1 = wp(ab);
      turnWorld(kb, new THREE.Quaternion().setFromUnitVectors(A1.sub(K1).normalize(), T.clone().sub(K1).normalize()));
      // her foot turned as it was: its sole where her legs put it
      ab.quaternion.copy(wq(kb).invert().multiply(foot)); ab.updateMatrixWorld(true);
    }
    if (list.length) bent.push({ bones: list, pre, post: list.map((b) => b.quaternion.clone()) });
  }

  /**
   * HER SOLES NEVER GO INTO THE FLOOR. Her feet stand her on two points of each foot (actor/humanFeet.ts: the ball and
   * the heel), and the shoe round them is bigger than those points: rocked on its ball as it leaves the floor, its toe
   * box went under (measured on the strip, 2026-11-08). So each sole's lowest points (`WalkFeet.soles`) are read as drawn
   * and a foot any of them is below the floor is raised by that much, its leg bent to reach it (`bendLegs`): the shoe
   * stands on the floor where it touches it.
   */
  function keepSoles(sk: THREE.SkinnedMesh, f: WalkFeet): void {
    const p = new THREE.Vector3(), under: [number, number] = [0, 0];
    f.soles.forEach((sole, k) => {
      let most = 0;
      // (the floor is the slope's, drawn through where she stands)
      for (const i of sole.verts) { sole.mesh.getVertexPosition(i, p); sole.mesh.localToWorld(p); most = Math.max(most, sole.floor + stageY(p.x / M, p.z / M) * M - p.y); }
      under[k] = most;
    });
    bendLegs(sk, under);
  }

  /**
   * HER TOES STAY ON THE FLOOR AS HER HEEL LEAVES IT. As a foot leaves the floor it rests on its ball with its heel
   * high, and her toes, held straight on her foot, went into the floor under it: 1.2 cm of shoe, once a step (measured
   * on the strip, 2026-11-08). A walker's toes bend up at the ball of the foot instead and stay flat. So, over her bones
   * as drawn, each foot whose toes' end has come lower than it stands over the floor in her bind (`WalkFeet.bind`) has
   * its toes turned up about the ball of the foot, keeping their heading, until they are back at that height -- never
   * past TOE_BEND_MOST.
   */
  /** The most her toes bend up at the ball of the foot. BIOLOGICAL SHAPE: a walker's toes bend up 40-55 degrees as the heel
   * leaves the floor, inside the joint's 60-90 degrees. */
  const TOE_BEND_MOST = (60 * Math.PI) / 180;
  function flatToes(sk: THREE.SkinnedMesh, f: WalkFeet): void {
    if (!rig) return;
    const bones = sk.skeleton.bones, perUnit = M / f.upm, list: THREE.Object3D[] = [], pre: THREE.Quaternion[] = [];
    const wp = (b: THREE.Object3D) => b.getWorldPosition(new THREE.Vector3()), wq = (b: THREE.Object3D) => b.getWorldQuaternion(new THREE.Quaternion());
    for (const leg of f.state.legs) {
      const ball = leg.ball, end = ball >= 0 ? rig.bind.findIndex((b) => b.parent === ball) : -1;
      const b = bones[ball], e = bones[end];
      if (end < 0 || !b?.parent || e?.parent !== b) continue;
      const B = wp(b), d = wp(e).sub(B), E = wp(e), floorEnd = f.bind[end].y * perUnit + stageY(E.x / M, E.z / M) * M;
      if (d.y + B.y >= floorEnd) continue;
      const L = d.length(), across = Math.hypot(d.x, d.z);
      if (L < 1e-6 || across < 1e-6) continue;
      const y = Math.max(-L, Math.min(L, floorEnd - B.y)), r = Math.sqrt(L * L - y * y) / across;
      let q = new THREE.Quaternion().setFromUnitVectors(d.clone().normalize(), new THREE.Vector3(d.x * r, y, d.z * r).normalize());
      const angle = 2 * Math.acos(Math.min(1, Math.abs(q.w)));
      if (angle > TOE_BEND_MOST) q = new THREE.Quaternion().slerp(q, TOE_BEND_MOST / angle);
      list.push(b); pre.push(b.quaternion.clone());
      b.quaternion.copy(wq(b.parent).invert().multiply(q).multiply(wq(b))); b.updateMatrixWorld(true);
    }
    if (list.length) bent.push({ bones: list, pre, post: list.map((b) => b.quaternion.clone()) });
  }

  /**
   * Her place in a birth position: her feet on the floor where she stood (LEGS APART, SQUAT), or leaned back about her
   * hips onto what holds her up, her hips at `RECLINE_HIPS_M` (RECLINE). Worked out once a position, build and size.
   */
  function placeBirth(skin: THREE.SkinnedMesh): void {
    if (!model || !rig || !measure || !isBirthPose(pose)) return;
    const sit = pose === 'squat' ? squatSit() : 0;
    const key = `${pose}|${bonesBuilt}|${bump.toFixed(1)}|${standLift.toFixed(4)}|${sit.toFixed(3)}|${birthTweak ? JSON.stringify(birthTweak) : ''}`;
    if (birthPlaced?.key !== key) {
      // (her own skeleton: the model also carries her baby's -- found first once it is in her arms, and read as hers it
      // set her, sat back, 20 cm into the floor)
      const body = bodyOf()?.mesh ?? skin, bones = body.skeleton.bones, j = measure.joints, v = () => new THREE.Vector3();
      // (`sole`: the lower of her soles were each foot laid flat under its ankle -- FEET_ON_MAT lays them so)
      const flat = (a: number, at: THREE.Vector3) => at.y - (footShape(body, a)?.over ?? 0);
      const read = (turn?: THREE.Quaternion) => {
        model!.position.set(0, 0, 0); if (turn) model!.quaternion.copy(turn); else model!.quaternion.identity(); model!.updateMatrixWorld(true);
        const al = bones[j.ankleL].getWorldPosition(v()), ar = bones[j.ankleR].getWorldPosition(v());
        return { hips: bones[j.hipL].getWorldPosition(v()).add(bones[j.hipR].getWorldPosition(v())).multiplyScalar(0.5), feet: al.clone().add(ar).multiplyScalar(0.5), low: Math.min(al.y, ar.y), sole: Math.min(flat(j.ankleL, al), flat(j.ankleR, ar)) };
      };
      rig.apply(turnsFor('stand', standOut)); const stand = read();
      // (her feet's shapes, read standing: what lies flat is what her standing sole does)
      readFootShapes(body);
      rig.apply(turnsFor(pose, poseOut)); const now = read();
      const lean = ((birthTweak?.leanBack ?? (sit > 0 ? blendBirthSpec(BIRTH_POSES.squat, FLOOR_SIT, sit).leanBack : BIRTH_POSES[pose].leanBack)) * Math.PI) / 180, q = new THREE.Quaternion();
      // (the mat's top, as far down as a sole presses into it)
      const position = v(), mat = (BIRTH_MAT.thick + BIRTH_MAT.bevel - FEET_ON_MAT.sink) * M;
      // (the mat under her in a squat: where she sits back, behind her hips)
      if (pose === 'squat') matAt.set(stand.hips.x, 0, stand.hips.z - BIRTH_MAT.back * M);
      if (pose === 'squat' && sit > 0) {
        // SITTING BACK (P3b): leaned back about her hips; her feet kept over where they stood, and from standing on the mat
        // -- her soles flat on it -- down to sitting on it, her hips on it once she has sat back
        q.setFromAxisAngle(v().set(1, 0, 0), -lean);
        const back = read(q), onFeet = mat - back.sole, onHips = BIRTH_MAT.hips * M - back.hips.y;
        position.set(stand.feet.x - back.feet.x, onFeet + (onHips - onFeet) * sit, stand.feet.z - back.feet.z);
        squatSitAt = { sit, feetOffCm: +((back.sole + onHips - mat) / M * 100).toFixed(1), hipsY: +(back.hips.y / M * 100).toFixed(1), lowY: +(back.low / M * 100).toFixed(1), posY: +(position.y / M * 100).toFixed(1), leanDeg: +(lean * 180 / Math.PI).toFixed(1) } as typeof squatSitAt;
      } else if (lean > 0) {
        // leaned back (her top toward -z) about her hips, the hips where she stood, at the support's height
        q.setFromAxisAngle(v().set(1, 0, 0), -lean);
        position.set(stand.hips.x, RECLINE_HIPS_M * M, stand.hips.z).sub(now.hips.clone().applyQuaternion(q));
      } else if (pose === 'squat') position.set(stand.feet.x - now.feet.x, mat - now.sole, stand.feet.z - now.feet.z);
      else position.set(stand.feet.x - now.feet.x, stand.low + standLift * M - now.low, stand.feet.z - now.feet.z);
      birthPlaced = { key, position, quaternion: q };
      rig.apply(currentTurns()); handsOnKnees();
    }
    model.position.copy(birthPlaced.position); model.quaternion.copy(birthPlaced.quaternion);
    model.updateMatrixWorld(true);
    stool.visible = false;
    placeMat(pose === 'squat');
    plantFeet();
    keepBalance();
    if (!aimHeld) orbit.target.z = ORBIT_START.target.z;
  }
  /** Leaned back in RECLINE, her hips are this high off the floor (metres): a bed's edge. GAME TUNING. */
  const RECLINE_HIPS_M = 0.55;
  /** THE MAT (P3b): soft, on the floor under her squat and where she sits back (BIRTH_MAT); `matAt` its middle on the floor. */
  let birthMatMesh: THREE.Mesh | null = null, squatSitAt: { sit: number; feetOffCm: number; [k: string]: number } | null = null;
  const matAt = new THREE.Vector3();
  function placeMat(show: boolean): void {
    if (!show) { if (birthMatMesh) birthMatMesh.visible = false; return; }
    if (!birthMatMesh) {
      const B = BIRTH_MAT, w = B.wide * M, l = B.long * M, r = 0.06 * M, shape = new THREE.Shape();
      shape.moveTo(-w / 2 + r, -l / 2); shape.lineTo(w / 2 - r, -l / 2); shape.quadraticCurveTo(w / 2, -l / 2, w / 2, -l / 2 + r); shape.lineTo(w / 2, l / 2 - r); shape.quadraticCurveTo(w / 2, l / 2, w / 2 - r, l / 2);
      shape.lineTo(-w / 2 + r, l / 2); shape.quadraticCurveTo(-w / 2, l / 2, -w / 2, l / 2 - r); shape.lineTo(-w / 2, -l / 2 + r); shape.quadraticCurveTo(-w / 2, -l / 2, -w / 2 + r, -l / 2);
      const g = new THREE.ExtrudeGeometry(shape, { depth: B.thick * M, bevelEnabled: true, bevelThickness: B.bevel * M, bevelSize: 0.008 * M, bevelSegments: 3, curveSegments: 8 });
      g.rotateX(-Math.PI / 2);
      birthMatMesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x8fa9bd, roughness: 0.95, metalness: 0 }));
      birthMatMesh.name = 'birth-mat';
      three.add(birthMatMesh);
    }
    birthMatMesh.position.copy(matAt); birthMatMesh.visible = true;
  }

  /** Her foot's skin (P3b): the vertices her ankle and the bones under it carry at least 30% of -- once a body and an ankle. */
  const footVertsOf = new WeakMap<THREE.SkinnedMesh, Map<number, Uint32Array>>();
  function footVerts(sk: THREE.SkinnedMesh, ankle: number): Uint32Array {
    let byAnkle = footVertsOf.get(sk); if (!byAnkle) { byAnkle = new Map(); footVertsOf.set(sk, byAnkle); }
    const had = byAnkle.get(ankle); if (had) return had;
    const bones = sk.skeleton.bones, under = new Set<number>();
    bones.forEach((b, k) => { for (let o: THREE.Object3D | null = b; o; o = o.parent) if (o === bones[ankle]) { under.add(k); break; } });
    const si = sk.geometry.getAttribute('skinIndex'), sw = sk.geometry.getAttribute('skinWeight'), out: number[] = [];
    // (her foot carrying at least 30% of it: her heel too, which her own weights give half to her shin)
    for (let i = 0; i < si.count; i++) { let wf = 0; for (let c = 0; c < 4; c++) if (under.has(si.getComponent(i, c))) wf += sw.getComponent(i, c); if (wf >= 0.3) out.push(i); }
    const verts = Uint32Array.from(out); byAnkle.set(ankle, verts); return verts;
  }
  /**
   * Each foot as one rigid thing under its ankle (P3b, plantFeet): points of its skin turned into its ankle's frame but
   * kept the world's size (`pts`, xyz each, at most ~600), the way up from its sole when it stands flat (`up`, from her
   * standing), how far its ankle is over that sole (`over`) and its toes' furthest point (`toe`). Read standing, once a
   * body, a build and an ankle.
   */
  interface FootShape { readonly pts: Float32Array; readonly up: THREE.Vector3; readonly over: number; readonly toe: THREE.Vector3 }
  const footShapesOf = new WeakMap<THREE.SkinnedMesh, Map<string, FootShape>>();
  function footShape(sk: THREE.SkinnedMesh, ankle: number): FootShape | null { return footShapesOf.get(sk)?.get(`${bonesBuilt}|${ankle}`) ?? null; }
  /** (with her standing pose on her bones and her model unturned) */
  function readFootShapes(sk: THREE.SkinnedMesh): void {
    if (!measure) return;
    let byKey = footShapesOf.get(sk); if (!byKey) { byKey = new Map(); footShapesOf.set(sk, byKey); }
    for (const ankle of [measure.joints.ankleL, measure.joints.ankleR]) {
      const key = `${bonesBuilt}|${ankle}`; if (byKey.has(key)) continue;
      const verts = footVerts(sk, ankle), bone = sk.skeleton.bones[ankle], A = bone.getWorldPosition(new THREE.Vector3()), qi = bone.getWorldQuaternion(new THREE.Quaternion()).invert();
      const step = Math.max(1, Math.floor(verts.length / 600)), pts: number[] = [], p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0).applyQuaternion(qi).normalize(), toe = new THREE.Vector3();
      let over = 0, far = -1;
      for (let k = 0; k < verts.length; k += step) {
        sk.getVertexPosition(verts[k], p); sk.localToWorld(p); p.sub(A).applyQuaternion(qi);
        pts.push(p.x, p.y, p.z); over = Math.max(over, -p.dot(up));
        const d = p.length(); if (d > far) { far = d; toe.copy(p); }
      }
      if (pts.length) byKey.set(key, { pts: Float32Array.from(pts), up, over, toe });
    }
  }

  /**
   * HER FEET ON THE MAT, this frame (FEET_ON_MAT), over her bones as placed:
   * 1. each foot turned at its ankle -- about its own crosswise axis, the way an ankle points and flexes a foot -- to lie
   *    flat, as far as the ankle's placed range lets it (data/jointRange.ts);
   * 2. squatting, her body raised or lowered onto her feet so they stand on the mat (her weight is on them);
   * 3. sat back, her hips on the mat, each knee turned in its leg's own plane to set its foot down instead -- flat on the
   *    mat, or on its heel with its toes up where the ankle has gone as far as it goes. On the way down, the two shared
   *    as she has sat back.
   */
  let feetPlanted: Record<string, number> | null = null, plantOff = false;
  const plantKeep: Record<string, { pre: THREE.Quaternion[]; post: THREE.Quaternion[] } | undefined> = {};
  function plantFeet(): void {
    feetPlanted = null;
    if (pose !== 'squat' || !model || !measure || !birthAngles || plantOff) return;
    const sk = bodyOf()?.mesh; if (!sk) return;
    const bones = sk.skeleton.bones, j = measure.joints, F = FEET_ON_MAT, DEG = Math.PI / 180, Y = new THREE.Vector3(0, 1, 0);
    const ground = (BIRTH_MAT.thick + BIRTH_MAT.bevel - F.sink) * M, sit = squatSit();
    const plantar = rangeDeg('ankle', 'plantarflexion', 'female', 'passive'), dorsi = rangeDeg('ankle', 'dorsiflexion', 'female', 'passive'), kneeMost = rangeDeg('knee', 'flexion', 'female', 'passive');
    model.updateMatrixWorld(true);
    const out: Record<string, number> = {}, wp = (i: number) => bones[i].getWorldPosition(new THREE.Vector3());
    // a bone turned about its own joint by a turn in the world
    const turnBone = (b: THREE.Object3D, axis: THREE.Vector3, ang: number) => {
      if (!b.parent || Math.abs(ang) < 1e-9) return;
      const pw = b.parent.getWorldQuaternion(new THREE.Quaternion()).invert(), bw = b.getWorldQuaternion(new THREE.Quaternion());
      b.quaternion.copy(pw.multiply(new THREE.Quaternion().setFromAxisAngle(axis, ang)).multiply(bw)); b.updateMatrixWorld(true);
    };
    const legOf = (name: 'L' | 'R', hip: number, knee: number, ankle: number) => {
      const shape = footShape(sk, ankle); if (!shape) return null;
      const kb = bones[knee], ab = bones[ankle];
      // (placed again with no new pose since: set from where her pose put the leg, not from where it was set)
      const keep = plantKeep[name];
      if (keep && kb.quaternion.angleTo(keep.post[0]) < 1e-6 && ab.quaternion.angleTo(keep.post[1]) < 1e-6) { kb.quaternion.copy(keep.pre[0]); ab.quaternion.copy(keep.pre[1]); kb.updateMatrixWorld(true); }
      const pre = [kb.quaternion.clone(), ab.quaternion.clone()];
      // her ankle's and knee's angles as posed (dorsiflexion and flexion, degrees), and how far each is turned from there
      const a0 = name === 'L' ? birthAngles!.ankleL : birthAngles!.ankleR, k0 = name === 'L' ? birthAngles!.kneeL : birthAngles!.kneeR;
      const qA = new THREE.Quaternion(), p = new THREE.Vector3(), L = { name, kb, ab, pre, ankleBy: 0, kneeBy: 0, short: 0 };
      const lowest = () => { ab.getWorldQuaternion(qA); const P = shape.pts; let low = Infinity; for (let k = 0; k < P.length; k += 3) low = Math.min(low, p.set(P[k], P[k + 1], P[k + 2]).applyQuaternion(qA).y); return wp(ankle).y + low; };
      // her sole turned level about her foot's crosswise axis (its toes up that way are dorsiflexion), within her range
      const level = () => {
        ab.getWorldQuaternion(qA);
        const t = shape.toe.clone().applyQuaternion(qA).setY(0); if (t.lengthSq() < 1e-12) return;
        const ax = t.normalize().cross(Y).normalize(), u = shape.up.clone().applyQuaternion(qA);
        u.addScaledVector(ax, -u.dot(ax)); if (u.lengthSq() < 1e-12) return;
        const th = Math.atan2(ax.dot(u.clone().cross(Y)), u.dot(Y));
        const held = Math.min(dorsi - a0, Math.max(-plantar - a0, L.ankleBy + th / DEG));
        turnBone(ab, ax, (held - L.ankleBy) * DEG); L.ankleBy = held;
      };
      // her knee turned (about her leg's plane's normal: + bends it further) so the lowest of her foot as it lies now comes
      // down on the mat -- her ankle round the circle her shin sweeps to the height that puts it there, the nearer way
      // round (opening her knee rather than bending it, `tuck`)
      const set = () => {
        const H = wp(hip), K = wp(knee), A = wp(ankle), n = K.clone().sub(H).cross(A.clone().sub(K)); if (n.lengthSq() < 1e-12) return;
        n.normalize();
        const want = ground + A.y - lowest();
        if (Math.abs(want - A.y) < F.still * M) return;
        const e1 = A.clone().sub(K), b = e1.length(); e1.divideScalar(b);
        const e2 = n.clone().cross(e1), R = Math.hypot(e1.y, e2.y); if (R < 1e-6) return;
        const c = Math.min(1, Math.max(-1, (want - K.y) / (b * R))), f0 = Math.atan2(e2.y, e1.y), ac = Math.acos(c);
        let best = 0, bestCost = Infinity;
        for (const f of [f0 + ac, f0 - ac]) {
          const phi = Math.atan2(Math.sin(f), Math.cos(f)), to = L.kneeBy + phi / DEG;
          if (k0 + to < 0 || k0 + to > kneeMost || Math.abs(to) > F.kneeMost) continue;
          const cost = Math.abs(phi / DEG) + (phi > 0 ? F.tuck : 0);
          if (cost < bestCost) { bestCost = cost; best = phi; }
        }
        if (!Number.isFinite(bestCost)) return;
        L.kneeBy += best / DEG; turnBone(kb, n, best);
      };
      const report = () => {
        ab.getWorldQuaternion(qA);
        out[name + 'Ankle'] = +(a0 + L.ankleBy).toFixed(1); out[name + 'AnkleBy'] = +L.ankleBy.toFixed(1); out[name + 'Knee'] = +(k0 + L.kneeBy).toFixed(1); out[name + 'KneeBy'] = +L.kneeBy.toFixed(1);
        out[name + 'LowCm'] = +((lowest() - ground) / M * 100).toFixed(2); out[name + 'TiltDeg'] = +(Math.acos(Math.min(1, shape.up.clone().applyQuaternion(qA).y)) / DEG).toFixed(1);
        out[name + 'KneeY'] = +(wp(knee).y / M * 100).toFixed(1);
      };
      return { L, level, set, lowest, report };
    };
    const legs = [legOf('L', j.hipL, j.kneeL, j.ankleL), legOf('R', j.hipR, j.kneeR, j.ankleR)].filter((x): x is NonNullable<typeof x> => !!x);
    // 1. flat, 2. her body onto her feet as far as she is still squatting, 3. her knees for the rest, once sat back
    for (const g of legs) g.level();
    if (legs.length) {
      const lift = (1 - Math.min(1, Math.max(0, sit))) * legs.reduce((acc, g) => acc + (ground - g.lowest()), 0) / legs.length;
      if (Math.abs(lift) > 1e-6) { model.position.y += lift; model.updateMatrixWorld(true); }
      out.liftCm = +(lift / M * 100).toFixed(2);
    }
    if (sit > 0) for (const g of legs) for (let r = 0; r < F.rounds; r++) { g.set(); g.level(); }
    for (const g of legs) { g.report(); plantKeep[g.L.name] = { pre: g.L.pre, post: [g.L.kb.quaternion.clone(), g.L.ab.quaternion.clone()] }; }
    // (and every other skeleton of hers given the same turns, bone for bone by name)
    { const moved = [j.kneeL, j.ankleL, j.kneeR, j.ankleR].map((i) => bones[i]), seen = new Set<THREE.Skeleton>([sk.skeleton]);
      for (const m of skinned) { if (!m.skeleton || seen.has(m.skeleton)) continue; seen.add(m.skeleton); for (const b of moved) { const o = m.skeleton.bones.find((x) => x.name === b.name); if (o && o !== b) o.quaternion.copy(b.quaternion); } } }
    feetPlanted = out;
  }

  /**
   * HER BALANCE (P3b, squatting): her centre of mass against the ground her feet stand on. Each part of her at its share of
   * a woman's mass and its own centre along its bones (MEASURED: de Leva 1996, after Zatsiorsky -- head and neck 6.68%,
   * trunk 42.57% (at 41.5% of the way from her neck's base to her hips' middle), upper arm 2.55% (57.5% down from the
   * shoulder), forearm 1.38% (45.6% from the elbow), hand 0.56%, thigh 14.78% (36.1% from the hip), shank 4.81% (44.2%
   * from the knee), foot 1.29%); and what her womb carries at its middle as BALANCE_WOMB of all of it at full term
   * (BIOLOGICAL SHAPE: a term baby, placenta, waters and womb, about 5.8 kg of a 77 kg woman). Her support: where her soles
   * touch the mat. Read from her bones as drawn; null with no feet planted.
   */
  const BALANCE_WOMB = 0.075;
  function balanceOf(): { com: THREE.Vector3; touch: THREE.Vector3[]; ahead: THREE.Vector3; side: THREE.Vector3; ankles: THREE.Vector3 } | null {
    const sk = bodyOf()?.mesh; if (!sk || !measure || !model || !rig) return null;
    model.updateMatrixWorld(true);
    const b = sk.skeleton.bones, j = measure.joints, wp = (i: number) => b[i].getWorldPosition(new THREE.Vector3()), mid = (a: THREE.Vector3, c: THREE.Vector3, t: number) => a.clone().lerp(c, t);
    const hand = handJointsOf(rig!.bind);
    const hipM = wp(j.hipL).add(wp(j.hipR)).multiplyScalar(0.5), neck = wp(j.neck);
    const parts: [number, THREE.Vector3][] = [
      [0.0668, wp(j.head)], [0.4257, mid(neck, hipM, 0.415)],
      [0.0255, mid(wp(j.shoulderL), wp(j.elbowL), 0.575)], [0.0255, mid(wp(j.shoulderR), wp(j.elbowR), 0.575)],
      [0.0138, mid(wp(j.elbowL), wp(j.wristL), 0.456)], [0.0138, mid(wp(j.elbowR), wp(j.wristR), 0.456)],
      [0.0056, hand[0] ? mid(wp(j.wristL), wp(hand[0].tip), 0.4) : wp(j.wristL)], [0.0056, hand[1] ? mid(wp(j.wristR), wp(hand[1].tip), 0.4) : wp(j.wristR)],
      [0.1478, mid(wp(j.hipL), wp(j.kneeL), 0.361)], [0.1478, mid(wp(j.hipR), wp(j.kneeR), 0.361)],
      [0.0481, mid(wp(j.kneeL), wp(j.ankleL), 0.442)], [0.0481, mid(wp(j.kneeR), wp(j.ankleR), 0.442)],
    ];
    // her feet, and the ground under them: each foot's middle, and the points of its sole within 1.5 cm of the mat
    const ground = (pose === 'squat' ? BIRTH_MAT.thick + BIRTH_MAT.bevel : 0) * M, touch: THREE.Vector3[] = [], q = new THREE.Quaternion(), p = new THREE.Vector3();
    for (const a of [j.ankleL, j.ankleR]) {
      const f = footShape(sk, a); if (!f) continue;
      const A = wp(a); b[a].getWorldQuaternion(q); const c = new THREE.Vector3(); let n = 0;
      for (let k = 0; k < f.pts.length; k += 3) { p.set(f.pts[k], f.pts[k + 1], f.pts[k + 2]).applyQuaternion(q).add(A); c.add(p); n++; if (p.y < ground + 0.015 * M) touch.push(p.clone()); }
      if (n) parts.push([0.0129, c.divideScalar(n)]);
    }
    if (!touch.length) return null;
    // what her womb carries, at its middle (her baby once born is in her arms or on her: counted with her womb till then)
    if (babyWomb && babyHolder && pregnant()) parts.push([BALANCE_WOMB * Math.min(1.5, bump / 100), babyHolder.localToWorld(babyWomb.centre.clone())]);
    const com = new THREE.Vector3(); let m = 0; for (const [w, at] of parts) { com.addScaledVector(at, w); m += w; } com.divideScalar(m);
    // her forward: from between her hips toward between her knees, level
    const ahead = wp(j.kneeL).add(wp(j.kneeR)).multiplyScalar(0.5).sub(hipM).setY(0).normalize(), side = new THREE.Vector3(0, 1, 0).cross(ahead).normalize();
    return { com, touch, ahead, side, ankles: wp(j.ankleL).add(wp(j.ankleR)).multiplyScalar(0.5) };
  }
  function balanceNow(): { com: number[]; support: { back: number; front: number; left: number; right: number }; marginBackCm: number; marginFrontCm: number; tippedDeg: number } | null {
    const r = balanceOf(); if (!r) return null;
    let back = Infinity, front = -Infinity, left = Infinity, right = -Infinity;
    for (const t of r.touch) { const u = t.clone().sub(r.com).dot(r.ahead), v = t.clone().sub(r.com).dot(r.side); back = Math.min(back, u); front = Math.max(front, u); left = Math.min(left, v); right = Math.max(right, v); }
    const cm = (x: number) => +(x / M * 100).toFixed(1);
    return { com: r.com.toArray().map(cm), support: { back: cm(back), front: cm(front), left: cm(left), right: cm(right) }, marginBackCm: cm(-back), marginFrontCm: cm(front), tippedDeg: +balanceTipped.toFixed(2) };
  }
  /**
   * HER BALANCE KEPT, SQUATTING (P3b; Joshua's plan, #275: "a small pose-specific balance correction allowed"): upright in
   * her squat her centre of mass stood 1.7 cm behind her heels -- she would have sat down backwards. Where it is not
   * BALANCE_KEEP.margin inside where her soles touch the mat, front or back, her whole body is tipped over her ankles
   * (as anyone balances on their feet) until it is, at most BALANCE_KEEP.most degrees, her feet set flat again under her
   * (plantFeet); less as she sits back on the mat, which holds her then. After the placing and the planting.
   */
  let balanceTipped = 0;
  function keepBalance(): void {
    balanceTipped = 0;
    if (pose !== 'squat' || !model || plantOff) return;
    const sit = squatSit(); if (sit >= 1) return;
    const r = balanceOf(); if (!r) return;
    const up = new THREE.Vector3(0, 1, 0), P = r.ankles, B = BALANCE_KEEP;
    let back = Infinity, front = -Infinity; for (const t of r.touch) { const u = t.clone().sub(P).dot(r.ahead); back = Math.min(back, u); front = Math.max(front, u); }
    const d0 = r.com.clone().sub(P).dot(r.ahead), h0 = r.com.clone().sub(P).dot(up), R = Math.hypot(d0, h0);
    const lo = back + B.margin * M, hi = front - B.margin * M;
    const want = d0 < lo ? lo : d0 > hi ? hi : d0;
    if (want === d0 || R < 1e-9 || lo > hi) return;
    // tipped by th about the line across her ankles: its way ahead of them is R sin(phi + th)
    const phi = Math.atan2(d0, h0), th = Math.max(-B.most, Math.min(B.most, (Math.asin(Math.max(-1, Math.min(1, want / R))) - phi) * 180 / Math.PI)) * (1 - sit);
    if (Math.abs(th) < 1e-3) return;
    const q = new THREE.Quaternion().setFromAxisAngle(up.clone().cross(r.ahead).normalize(), th * Math.PI / 180);
    model.position.sub(P).applyQuaternion(q).add(P); model.quaternion.premultiply(q); model.updateMatrixWorld(true);
    balanceTipped = th;
    plantFeet();
  }

  /**
   * HER CONTACT POINTS (P4, touch & grip; actor/contactPoints.ts): measured once a body on her rest mesh -- her rest shape
   * and her bones' joints taken to her rest frame (metres) -- and read back on her live skin through surface anchors
   * (bodySurface.ts). Drawn as dots when asked (a probe, or the room's CONTACTS check): finger pads blue, fingertips
   * cyan, palm green, feet orange, knees and elbows violet.
   */
  /** where a contact point is on her now: on her body, or on her own fingers (ownFingersMesh.ts), each its own surface */
  interface ContactSurface { evaluate(a: SurfaceAnchor, out: THREE.Vector3): THREE.Vector3 }
  let contactSet: { mesh: THREE.SkinnedMesh; set: ContactSet; surface: ContactSurface } | null = null, contactsShown = false, contactDots: THREE.InstancedMesh | null = null;
  function contactsOf(): { mesh: THREE.SkinnedMesh; set: ContactSet; surface: ContactSurface } | null {
    const b = bodyOf(), sb = b ? shaped.find((x) => x.mesh === b.mesh) : undefined;
    if (!b || !sb || !measure || !rig || !babyFrame || !sb.fields.basePos) return null;
    if (contactSet?.mesh === b.mesh) return contactSet;
    const mesh = b.mesh, tris = (mesh.userData.allIndices as ArrayLike<number> | undefined) ?? mesh.geometry.index?.array;
    if (!tris) return null;
    const base = sb.fields.basePos, toRest = babyFrame.meshToRest, v = new THREE.Vector3();
    const pos = new Float32Array(base.length);
    for (let i = 0; i < base.length; i += 3) v.set(base[i], base[i + 1], base[i + 2]).applyMatrix4(toRest).toArray(pos, i);
    const bones = mesh.skeleton.bones, bindInv = new THREE.Matrix4().copy(mesh.bindMatrix).invert(), joints = new Float32Array(bones.length * 3), m = new THREE.Matrix4();
    bones.forEach((_, k) => v.setFromMatrixPosition(m.multiplyMatrices(bindInv, m.clone().copy(mesh.skeleton.boneInverses[k]).invert())).applyMatrix4(toRest).toArray(joints, k * 3));
    const parents = bones.map((bn) => bones.indexOf(bn.parent as THREE.Bone));
    const j = measure.joints;
    const named = { wristL: j.wristL, wristR: j.wristR, elbowL: j.elbowL, elbowR: j.elbowR, kneeL: j.kneeL, kneeR: j.kneeR, ankleL: j.ankleL, ankleR: j.ankleR };
    const set = measureContacts({ pos, tris, joints, parents, named }), herSurface = new BodySurface(mesh, tris, base);
    // her own fingers' pads and tips are found on them, the same way (her thumbs, palms and the rest on her)
    if (ownFingers && ownFingersOn) {
      const r = ownFingers.rest(), theirs = measureContacts({ pos: r.pos, tris: r.tris, joints, parents, named });
      const own = (site: string) => /^(index|middle|ring|little)(Pad|Tip)$/.test(site);
      const mine = new Set(theirs.points.filter((p) => own(p.site))), fingerSurface = new BodySurface(ownFingers.mesh, r.tris, r.base);
      const points = [...set.points.filter((p) => !own(p.site)), ...mine];
      const missing = [...set.missing.filter((x) => !own(x.split('.')[1] ?? '')), ...theirs.missing.filter((x) => own(x.split('.')[1] ?? ''))];
      contactSet = { mesh, set: { points, missing }, surface: { evaluate: (a, out) => (mine.has(a as ContactPoint) ? fingerSurface : herSurface).evaluate(a, out) } };
      return contactSet;
    }
    contactSet = { mesh, set, surface: herSurface };
    return contactSet;
  }
  const CONTACT_COLOURS: Record<string, number> = { Pad: 0x2f7cf6, Tip: 0x22d3ee, palm: 0x22c55e, palmHeel: 0x16a34a, heel: 0xf97316, ball: 0xfb923c, toes: 0xfdba74, knee: 0xa855f7, elbow: 0xa855f7 };
  const contactColour = (p: ContactPoint): number => CONTACT_COLOURS[p.site.endsWith('Pad') ? 'Pad' : p.site.endsWith('Tip') ? 'Tip' : p.site] ?? 0xffffff;
  function drawContacts(): void {
    if (!contactsShown) { if (contactDots) contactDots.visible = false; return; }
    const c = contactsOf(); if (!c) return;
    const pts = c.set.points;
    if (!contactDots || contactDots.count !== pts.length) {
      contactDots?.removeFromParent(); contactDots?.geometry.dispose();
      contactDots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0045 * M, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: true }), pts.length);
      contactDots.name = 'contact-dots'; contactDots.frustumCulled = false; contactDots.renderOrder = 5;
      pts.forEach((p, i) => contactDots!.setColorAt(i, new THREE.Color(contactColour(p))));
      three.add(contactDots);
    }
    const at = new THREE.Vector3(), mtx = new THREE.Matrix4();
    c.mesh.updateMatrixWorld(true);
    pts.forEach((p, i) => { c.surface.evaluate(p, at); c.mesh.localToWorld(at); contactDots!.setMatrixAt(i, mtx.makeTranslation(at.x, at.y, at.z)); });
    contactDots.instanceMatrix.needsUpdate = true; if (contactDots.instanceColor) contactDots.instanceColor.needsUpdate = true;
    contactDots.visible = true;
  }

  /**
   * THE TOUCH BENCH (P4, touch & grip; Joshua's plan #279, "press one exact button, pick up the tablet, hold the baby,
   * all through one shared logic"): standing, a small table before her with what she is to touch on it, set where she
   * stood when it was asked for, and her hand put to it by the same reach as her hands on her knees and her baby
   * (handsOnKnees), then each finger closed until its pad meets it (actor/handGrip.ts) -- or, pressing, her index finger
   * left straight with its tip on the button and the rest closed loosely.
   * CUP: her right hand round a cup, her palm on its side toward her, fingers and thumb closed round it.
   * BUTTON: her right index fingertip on a call button on a post before her, that finger straight and the rest curled.
   * TABLET (Joshua, 2026-11-05, choosing it: "One hand, reading" -- resting on her palm and fingers underneath, her thumb
   * over its front edge, her other hand free to tap it): a tablet held up before her to read, its screen toward her eyes,
   * in her LEFT hand -- her palm and fingers under its back, up it from its lower left corner, its left edge in the web of
   * her thumb, her thumb over that edge onto its front.
   * SHOW: her right hand held out before her as if to shake hands, in a hand shape (HAND_SHAPES: a fist, open, or one finger lifted
   * from a fist) -- for looking at her hand from every side (Joshua, 2026-11-05: "render the hand in a fist, then lift each
   * finger separately and do 3 sides to see how it looks and make sure it looks like a real hand").
   */
  type TouchTest = 'off' | 'cup' | 'button' | 'tablet' | 'show';
  let touchTest: TouchTest = 'off', touchProps: THREE.Group | null = null, touchShapes: { cup?: GripShape; table?: GripShape; button?: GripShape; panel?: GripShape; tablet?: GripShape } = {}, touchAt: { cup?: THREE.Vector3; button?: THREE.Vector3; tablet?: { centre: THREE.Vector3; across: THREE.Vector3; up: THREE.Vector3; out: THREE.Vector3 } } | null = null;
  /** GAME TUNING (metres): the cup's radius and height, where it stands from her right shoulder (her right, down, ahead)
   * and how far up it her palm goes, round from its right side toward her by `side` (her palm there as a hand shakes), and
   * how far (degrees) her fingers may turn from round it; the table's top under it, its size and leg thickness; how far (a share of its base's
   * closing bend) her thumb opens first.
   * BUTTON: the middle of the button's face from her right shoulder (her right, down, ahead), its radius and how far it
   * stands off its panel, the panel (wide, tall, deep) and how far the button sits above the panel's middle; her hand
   * pointing `dip` degrees below level and turned `roll` degrees from thumb-up toward palm-down (a forearm half turned,
   * as a hand reaching out to a button is), its fingers turned at most `turnsMost`.
   * TABLET: its size (MEASURED, an 11-inch tablet: 24.8 x 17.9 cm, 7 mm thick), held upright, its middle from the middle of
   * her shoulders (to her left, down, ahead), its screen turned across toward a point `eyes` above her head joint and ahead
   * of it and tipped back `faceUp` degrees from upright;
   * the middle of her palm on its back `palmIn` in from its left edge and `palmUp` up from its lower edge, her hand's line
   * `palmOff` off its back, how far (degrees)
   * her fingers may turn from straight up it, and how far her thumb opens before it closes onto its front; her thumb's pad
   * on its screen `thumbIn` in from its left edge and `thumbUp` above the middle of her palm.
   * PRESS: how far each joint of each finger of a pointing hand closes, knuckle first (a share of its full bend) -- the
   * index all but straight, the others curled back (each finger can be apart from the next once her mesh's joins between
   * them are cut and each finger's skin is its own: actor/fingerSplit.ts, fingerWeights.ts), the thumb laid along the middle
   * finger's side. */
  const TOUCH_BENCH = Object.freeze({
    cup: { radius: 0.04, height: 0.1, right: 0.02, down: 0.36, ahead: 0.36, grip: 0.55, side: 0.35, turnsMost: 25 }, table: { wide: 0.7, deep: 0.45, thick: 0.03, leg: 0.03 }, thumbOpen: 0.6,
    button: { right: 0.0, down: 0.22, ahead: 0.55, radius: 0.012, cap: 0.005, panel: [0.09, 0.17, 0.025] as const, high: 0.035, post: 0.05, dip: 15, roll: 45, turnsMost: 25 },
    press: { thumb: [0.15, 0.35, 0.35], index: [0.04, 0.08, 0.04], middle: [0.7, 0.8, 0.55], ring: [0.75, 0.85, 0.6], little: [0.8, 0.85, 0.6] } as Readonly<Record<FingerName, readonly number[]>>,
    show: { right: 0.02, down: 0.16, ahead: 0.42, dip: 8 },
    tablet: { wide: 0.179, tall: 0.248, thick: 0.007, left: 0.06, down: 0.12, ahead: 0.36, eyes: [0.09, 0.08] as const, faceUp: 35, palmIn: 0.025, palmUp: 0.065, palmOff: 0.004, turnsMost: 25, thumbOpen: 0.9, thumbIn: 0.012, thumbUp: 0.0 },
  });
  /** GAME TUNING: hand shapes for the SHOW bench, each finger's closure knuckle first (a share of its full bend: bendFinger)
   * and its spread fourth -- a fist, the hand open, spread wide, and each finger (the thumb too) lifted straight from the
   * fist. */
  const FIST: Readonly<Record<FingerName, readonly number[]>> = Object.freeze({ thumb: [0.7, 0.85, 0.75], index: [0.9, 0.95, 0.75], middle: [0.92, 0.95, 0.75], ring: [0.94, 0.95, 0.75], little: [0.96, 0.95, 0.75] });
  const HAND_SHAPES: Readonly<Record<string, Readonly<Record<FingerName, readonly number[]>>>> = Object.freeze({
    fist: FIST, open: { thumb: [0, 0, 0], index: [0, 0, 0], middle: [0, 0, 0], ring: [0, 0, 0], little: [0, 0, 0] },
    spread: { thumb: [-0.8, 0, 0], index: [0, 0, 0, 0.7], middle: [0, 0, 0, 0.1], ring: [0, 0, 0, 0.45], little: [0, 0, 0, 0.9] },
    ...Object.fromEntries((['thumb', 'index', 'middle', 'ring', 'little'] as const).map((f) => [f, { ...FIST, [f]: [0, 0, 0] }])),
  });
  let showShape: Readonly<Record<FingerName, readonly number[]>> = FIST;
  /** GAME TUNING (P4, a reach for a thing): each radian her elbow is swung from where it hangs (down by her side, `elbowOut`
   * of the way out) costs `elbowLow` -- as a radian of a hand turned from the way asked does */
  const TOUCH_REACH = Object.freeze({ elbowLow: 1, elbowOut: 0.35 });
  /** GAME TUNING (radians; P4, a thumb on a place: thumbOnto): how far its base folds back (below 0) and across her palm,
   * how far it turns either way out of the way it folds (out of her palm's plane, or into it) and about its own length,
   * how far over the place (metres) it is first brought, and in how many steps it is lowered onto it; how thick its bones are as capsules (a share of its pad's depth: its pad is
   * its fullest) and its tip; what a radian of its turn about its length, or of its joints' bend, costs against a metre
   * of pad from its place (a thumb at ease, not hooked); and how far its outer joints bend; how many steps
   * the whole is searched in and how many times halved round the best; what a metre of thumb inside the thing costs
   * against a metre of pad from its place. */
  const THUMB_ON = Object.freeze({ fold: [-1.0, 1.8] as const, lift: 1.8, twist: 2.0, bend: 1.2, coarse: 7, refine: 6, inside: 5, thick: 0.8, tip: 0.5, ease: 0.002, over: 0.012, down: 4 });
  const touchHere = (): boolean => touchTest !== 'off' && pose === 'stand';
  function setTouchTest(mode: TouchTest): void {
    touchTest = mode; touchAt = null; touchShapes = {}; armSearch.L = undefined; armSearch.R = undefined;
    touchProps?.removeFromParent(); touchProps = null;
    if (mode === 'off' || !model || !measure) return;
    const sk = bodyOf()?.mesh; if (!sk) return;
    model.updateMatrixWorld(true);
    const S = sk.skeleton.bones[measure.joints.shoulderR].getWorldPosition(new THREE.Vector3()), C = TOUCH_BENCH.cup, Tb = TOUCH_BENCH.table;
    // (SHOW: nothing to touch -- her hand held up before her)
    if (mode === 'show') { touchAt = {}; return; }
    if (mode === 'tablet') {
      // A TABLET HELD UP TO READ: upright before her and a little to her left, its screen turned to her eyes (her front +z,
      // her left +x; the room stands her facing the camera)
      const Tt = TOUCH_BENCH.tablet, SL = sk.skeleton.bones[measure.joints.shoulderL].getWorldPosition(new THREE.Vector3());
      const mid = S.clone().add(SL).multiplyScalar(0.5), head = sk.skeleton.bones[measure.joints.head].getWorldPosition(new THREE.Vector3());
      const centre = new THREE.Vector3(mid.x + Tt.left * M, mid.y - Tt.down * M, mid.z + Tt.ahead * M);
      const eyes = new THREE.Vector3(head.x, head.y + Tt.eyes[0] * M, head.z + Tt.eyes[1] * M);
      // (`across` toward her left, `up` up it, `out` out of its screen toward her)
      // (turned to her eyes across, and tipped back `faceUp` degrees from upright, as a tablet read standing is held)
      const toEyes = eyes.clone().sub(centre).setY(0).normalize(), up0 = Tt.faceUp * Math.PI / 180;
      const out = toEyes.multiplyScalar(Math.cos(up0)).add(new THREE.Vector3(0, Math.sin(up0), 0)).normalize(), across = new THREE.Vector3(1, 0, 0).addScaledVector(out, -out.x).normalize(), up = new THREE.Vector3().crossVectors(across, out).normalize();
      if (up.y < 0) up.negate();
      touchAt = { tablet: { centre, across, up, out } };
      const g = new THREE.Group(); g.name = 'touch-bench';
      const body = new THREE.Mesh(new THREE.BoxGeometry(Tt.wide * M, Tt.tall * M, Tt.thick * M), new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.35, metalness: 0.5 }));
      const screen = new THREE.Mesh(new THREE.PlaneGeometry((Tt.wide - 0.014) * M, (Tt.tall - 0.014) * M), new THREE.MeshStandardMaterial({ color: 0x1b2a3a, emissive: 0x6d8fb8, emissiveIntensity: 0.35, roughness: 0.15 }));
      screen.position.z = (Tt.thick / 2 + 0.0003) * M; body.add(screen);
      // (its screen on its +z: turned so +x is to her right as she reads it, +y up it, +z toward her -- a turn, not a mirror)
      body.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(across.clone().negate(), up, out)); body.position.copy(centre); body.name = 'touch-tablet';
      g.add(body); three.add(g); touchProps = g;
      const V = (v: THREE.Vector3): [number, number, number] => [v.x, v.y, v.z];
      touchShapes.tablet = { kind: 'box', centre: V(centre), axes: [V(across), V(up), V(out)], half: [(Tt.wide / 2) * M, (Tt.tall / 2) * M, (Tt.thick / 2) * M] };
      return;
    }
    if (mode === 'button') {
      // A CALL BUTTON ON A POST before her, its face toward her (her front +z, her right -x): the button's face at the
      // place asked, its panel behind it, the post down to the floor
      const B = TOUCH_BENCH.button, at = new THREE.Vector3(S.x - B.right * M, S.y - B.down * M, S.z + B.ahead * M);
      touchAt = { button: at };
      const g = new THREE.Group(); g.name = 'touch-bench';
      const steel = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.35, metalness: 0.6 });
      const faceZ = at.z + B.cap * M, [pw, ph, pd] = B.panel, mid = new THREE.Vector3(at.x, at.y - B.high * M, faceZ + (pd / 2) * M);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(pw * M, ph * M, pd * M), steel); panel.position.copy(mid); g.add(panel);
      const postH = mid.y - (ph / 2) * M, post = new THREE.Mesh(new THREE.BoxGeometry(B.post * M, postH, B.post * M), steel);
      post.position.set(mid.x, postH / 2, mid.z); g.add(post);
      // (the button pressed, lit; one below it not)
      for (const [dy, lit] of [[0, true], [-2 * B.high, false]] as const) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(B.radius * M, B.radius * M, B.cap * M, 32), new THREE.MeshStandardMaterial({ color: lit ? 0xfff4d6 : 0xe8e8e8, emissive: lit ? 0xffb23a : 0x000000, emissiveIntensity: lit ? 0.6 : 0, roughness: 0.4 }));
        b.rotation.x = Math.PI / 2; b.position.set(at.x, at.y + dy * M, at.z + (B.cap / 2) * M); b.name = lit ? 'touch-button' : 'touch-button-2'; g.add(b);
      }
      three.add(g); touchProps = g;
      touchShapes.button = { kind: 'cylinder', a: [at.x, at.y, at.z], b: [at.x, at.y, faceZ], radius: B.radius * M };
      touchShapes.panel = { kind: 'box', centre: [mid.x, mid.y, mid.z], axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], half: [(pw / 2) * M, (ph / 2) * M, (pd / 2) * M] };
      return;
    }
    // (her right is -x, her front +z: the room stands her facing the camera)
    const cup = new THREE.Vector3(S.x - C.right * M, S.y - C.down * M, S.z + C.ahead * M);
    touchAt = { cup };
    const g = new THREE.Group(); g.name = 'touch-bench';
    const top = cup.y - (C.height / 2) * M;
    const wood = new THREE.MeshStandardMaterial({ color: 0xb08a5e, roughness: 0.8 });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(Tb.wide * M, Tb.thick * M, Tb.deep * M), wood);
    slab.position.set(cup.x + 0.12 * M, top - (Tb.thick / 2) * M, cup.z + 0.04 * M); g.add(slab);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const legH = top - Tb.thick * M, leg = new THREE.Mesh(new THREE.BoxGeometry(Tb.leg * M, legH, Tb.leg * M), wood);
      leg.position.set(slab.position.x + dx * (Tb.wide / 2 - 0.04) * M, legH / 2, slab.position.z + dz * (Tb.deep / 2 - 0.04) * M); g.add(leg);
    }
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(C.radius * M, C.radius * M, C.height * M, 40, 1, false), new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.35 }));
    mug.position.copy(cup); mug.name = 'touch-cup'; g.add(mug);
    three.add(g); touchProps = g;
    touchShapes.cup = { kind: 'cylinder', a: [cup.x, cup.y - (C.height / 2) * M, cup.z], b: [cup.x, cup.y + (C.height / 2) * M, cup.z], radius: C.radius * M };
    touchShapes.table = { kind: 'box', centre: [slab.position.x, slab.position.y, slab.position.z], axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], half: [(Tb.wide / 2) * M, (Tb.thick / 2) * M, (Tb.deep / 2) * M] };
  }
  /** Where a hand goes at the touch bench: its fingertip, the way its fingers point and the way the back of its hand
   * faces (as babyHandTarget's); null for a hand with nothing to touch. */
  function touchTargetOf(name: 'L' | 'R', handLen: number, perM: number): { tip: THREE.Vector3; along: THREE.Vector3; face: THREE.Vector3; palm?: THREE.Vector3; press?: THREE.Vector3; turnsMost?: number; lift?: number } | null {
    if (!touchHere() || !touchAt || !measure) return null;
    const sk = bodyOf()?.mesh; if (!sk) return null;
    if (touchTest === 'tablet' && touchAt.tablet) {
      // UNDER IT, HER LEFT HAND: her palm on its back, its fingers up it, the back of her hand away from it; the middle of
      // her palm `palmIn` in from its left edge, `palmUp` up from its lower edge -- so its left edge is in the web of her
      // thumb (her right hand left as it hangs, free)
      if (name !== 'L') return null;
      const Tt = TOUCH_BENCH.tablet, t = touchAt.tablet;
      const onBack = t.centre.clone().addScaledVector(t.out, -(Tt.thick / 2) * M).addScaledVector(t.across, (Tt.wide / 2 - Tt.palmIn) * M).addScaledVector(t.up, -(Tt.tall / 2 - Tt.palmUp) * M);
      const face = t.out.clone().negate(), along = t.up.clone();
      const palm = onBack.clone().addScaledVector(face, Tt.palmOff * perM), tip = palm.clone().addScaledVector(along, handLen * BABY_HANDS.palmAt);
      touchAsked = { tip: tip.clone(), along: along.clone(), face: face.clone(), centre: t.centre.clone() };
      return { tip, along, face, palm, turnsMost: Tt.turnsMost, lift: 0 };
    }
    if (name !== 'R') return null;
    if (touchTest === 'show') {
      // HELD OUT BEFORE HER AS A HAND IS OFFERED TO SHAKE: her forearm not turned, her thumb up, her palm to her left, her
      // fingers ahead (`dip` below level) -- every side of it to be seen, none of her in the way
      const H = TOUCH_BENCH.show, S = sk.skeleton.bones[measure.joints.shoulderR].getWorldPosition(new THREE.Vector3()), dip = H.dip * Math.PI / 180;
      const tip = new THREE.Vector3(S.x - H.right * M, S.y - H.down * M, S.z + H.ahead * M), along = new THREE.Vector3(0, -Math.sin(dip), Math.cos(dip)), face = new THREE.Vector3(-1, 0, 0);
      touchAsked = { tip: tip.clone(), along: along.clone(), face: face.clone(), centre: tip.clone() };
      return { tip, along, face, turnsMost: 0 };
    }
    if (touchTest === 'button' && touchAt.button) {
      // POINTING AT IT (Joshua, 2026-11-05: "rotate at shoulder joint forward with slight elbow bend… minimal
      // movements"): her hand ahead of her, `dip` below level, turned `roll` from thumb-up toward palm-down -- and her
      // index fingertip, the finger straight, on the button's face (where her wrist must be for that: handsOnKnees)
      const B = TOUCH_BENCH.button, dip = B.dip * Math.PI / 180;
      const along = new THREE.Vector3(0, -Math.sin(dip), Math.cos(dip)).normalize();
      // (a right hand thumb-up has its palm to her left, +x; turned about the way it points, toward palm-down)
      const palm = new THREE.Vector3(1, 0, 0).applyAxisAngle(along, -B.roll * Math.PI / 180).normalize();
      const at = touchAt.button.clone();
      touchAsked = { tip: at.clone(), along: along.clone(), face: palm.clone().negate(), centre: at.clone() };
      return { tip: at, along, face: palm.negate(), press: at.clone(), turnsMost: B.turnsMost };
    }
    if (touchTest === 'cup' && touchAt.cup) {
      const C = TOUCH_BENCH.cup, S = sk.skeleton.bones[measure.joints.shoulderR].getWorldPosition(new THREE.Vector3());
      // AS A HAND SHAKES (Joshua, 2026-11-05: "Make sure the arm is not rotated or twisted… make minimal movements… rotate
      // at shoulder joint forward with slight elbow bend"): her palm on the cup's side toward her right -- `side` of the
      // way round from her right toward her -- `grip` of the way up it, her thumb up and her fingers ahead round it, so
      // her forearm is not turned at all. (Her palm on its side toward her shoulder, her fingers had to point to her left:
      // a hand only a forearm turned 82 degrees could hold.) For a right hand, palm p and thumb up, the fingers are p x up.
      const centre = touchAt.cup.clone().setY(touchAt.cup.y + (C.grip - 0.5) * C.height * M);
      void S;
      const out = new THREE.Vector3(-1, 0, -C.side).normalize(), along = out.clone().negate().cross(new THREE.Vector3(0, 1, 0)).normalize();
      const palm = centre.clone().addScaledVector(out, C.radius * M + BABY_HANDS.palm * perM), tip = palm.clone().addScaledVector(along, handLen * BABY_HANDS.palmAt);
      touchAsked = { tip: tip.clone(), along: along.clone(), face: out.clone(), centre: centre.clone() };
      return { tip, along, face: out, palm, turnsMost: TOUCH_BENCH.cup.turnsMost };
    }
    return null;
  }
  let touchAsked: { tip: THREE.Vector3; along: THREE.Vector3; face: THREE.Vector3; centre: THREE.Vector3 } | null = null;
  /**
   * EACH FINGER CLOSED ONTO WHAT ITS HAND HOLDS (P4): a finger as a chain of capsules round its bones (as thick as its pad
   * is deep) and its pad and tip on its live skin (contactPoints), closed as the room curls a finger until the nearest
   * first meets the shape (handGrip.closeToTouch). Her bones as her arm has just been laid.
   */
  let gripLast: Record<string, number> | null = null, gripJoints: Record<string, number[]> = {};
  const contactLocal = new WeakMap<THREE.SkinnedMesh, Map<number, THREE.Vector3>>();
  /** Each contact point of hers where it is on its bone (its skin there rides that bone), read once. */
  function contactLocalOf(c: { mesh: THREE.SkinnedMesh; set: ContactSet; surface: ContactSurface }): Map<number, THREE.Vector3> {
    let local = contactLocal.get(c.mesh);
    if (!local) {
      const sk = c.mesh, bones = sk.skeleton.bones, v = new THREE.Vector3();
      local = new Map();
      sk.updateMatrixWorld(true);
      c.set.points.forEach((p, i) => { c.surface.evaluate(p, v); sk.localToWorld(v); local!.set(i, bones[p.bone].worldToLocal(v.clone())); });
      contactLocal.set(c.mesh, local);
    }
    return local;
  }
  const boneUnder = (bones: readonly THREE.Bone[], b: number, top: number) => { for (let o: THREE.Object3D | null = bones[b]; o; o = o.parent) if (o === bones[top]) return true; return false; };
  /** Each hand's fingers but its thumb, each from its knuckle out to its end bone (fingerWeights.ts). */
  function handsFingersOf(sk: THREE.SkinnedMesh): number[][][] {
    const bones = sk.skeleton.bones;
    return measure ? [measure.joints.wristL, measure.joints.wristR].map((wrist) => fingers.filter((f) => !f.thumb && boneUnder(bones, f.joints[0], wrist)).map((f) => {
      const last = bones[f.joints[f.joints.length - 1]], end = bones.findIndex((b) => b.parent === last);
      return end >= 0 ? [...f.joints, end] : [...f.joints];
    })) : [];
  }
  /** Each hand's thumb, base first (fingerWeights.ts). */
  function thumbsOf(sk: THREE.SkinnedMesh): number[][] {
    const bones = sk.skeleton.bones;
    return measure ? [measure.joints.wristL, measure.joints.wristR].map((wrist) => [...(fingers.find((f) => f.thumb && boneUnder(bones, f.joints[0], wrist))?.joints ?? [])]) : [];
  }
  /** Each hand's fingers but its thumb (handsFingersOf) and the way the back of the hand faces at rest (ownFingers.ts). */
  function ownHandsOf(sk: THREE.SkinnedMesh, toRest: THREE.Matrix4): OwnFingersHand[] {
    if (!measure) return [];
    const bones = sk.skeleton.bones, bindInv = new THREE.Matrix4().copy(sk.bindMatrix).invert(), m = new THREE.Matrix4();
    const at = (b: number): SplitV3 => new THREE.Vector3().setFromMatrixPosition(m.multiplyMatrices(bindInv, new THREE.Matrix4().copy(sk.skeleton.boneInverses[b]).invert())).applyMatrix4(toRest).toArray() as [number, number, number];
    const hands = handsFingersOf(sk);
    return [measure.joints.wristL, measure.joints.wristR].map((wrist, h) => {
      const chains = hands[h] ?? [], thumb = fingers.find((f) => f.thumb && boneUnder(bones, f.joints[0], wrist));
      const back = chains.length >= 2 && thumb ? handBack(at(wrist), chains.map((c) => at(c[0])), at(thumb.joints[0])) : ([0, 0, 1] as [number, number, number]);
      return { fingers: chains, back };
    });
  }
  /** Her own fingers drawn, or her file's (a probe's switch): which of her triangles she is drawn with, and theirs. */
  function layOwnFingers(): void {
    const bm = bodyOf()?.mesh;
    if (!bm || !ownFingers || !withFingers) return;
    const tris = ownFingersOn ? ownFingers.herTris : withFingers;
    bm.userData.allIndices = tris; bm.geometry.setIndex(new THREE.BufferAttribute(Uint32Array.from(tris), 1)); bm.userData.coverMask = undefined;
    ownFingers.mesh.visible = ownFingersOn;
    contactSet = null; contactLocal.delete(bm);
  }
  /**
   * A finger's joints closed by these shares of their full bends, knuckle first, and spread by the share in a fourth (P4).
   * A finger's full bends are her ACTIVE range in the master table (data/jointRange.ts: knuckle, middle and end joints;
   * back past straight at the knuckle; spread at the knuckle away from the middle finger, below 0 toward it); a thumb's
   * are its curl limits (fingerBend), its base opened below 0.
   */
  const FINGER_RANGE = ['mcpFlexion', 'pipFlexion', 'dipFlexion'] as const;
  function bendFinger(bones: readonly THREE.Bone[], f: Finger, bend: readonly number[]): void {
    const deg = Math.PI / 180;
    const radians = (k: number) => {
      const b = bend[k] ?? 0;
      if (f.thumb) return b >= 0 ? fingerBend(b * 100, k, true) : -fingerBend(-b * 100, k, true);
      if (b >= 0) return b * rangeDeg('finger', FINGER_RANGE[Math.min(2, k)], 'female') * deg;
      return k === 0 ? b * rangeDeg('finger', 'mcpHyperextension', 'female') * deg : 0;
    };
    const share = f.thumb ? 0 : bend[3] ?? 0, q = new THREE.Quaternion(), axis = new THREE.Vector3();
    rig!.set(f.joints.map((jt, k) => {
      // (the knuckle bent and spread at once: one turn, the spread after the bend)
      if (k === 0 && share !== 0 && f.spread.lengthSq() > 0) {
        q.setFromAxisAngle(f.spread, share * rangeDeg('finger', 'mcpSpread', 'female') * deg).multiply(new THREE.Quaternion().setFromAxisAngle(f.axis, radians(0)));
        const w = Math.min(1, Math.max(-1, q.w)), angle = 2 * Math.acos(w), sn = Math.sqrt(Math.max(0, 1 - w * w));
        if (sn > 1e-9) axis.set(q.x / sn, q.y / sn, q.z / sn); else axis.copy(f.axis);
        return { joint: jt, ax: axis.x, ay: axis.y, az: axis.z, radians: angle };
      }
      return { joint: jt, ax: f.axis.x, ay: f.axis.y, az: f.axis.z, radians: radians(k) };
    }));
    bones[f.joints[0]].updateMatrixWorld(true);
  }
  /** Every other skeleton of hers given these bones' turns, bone for bone by name. */
  function sameOnHerOthers(sk: THREE.SkinnedMesh, moved: readonly THREE.Bone[]): void {
    const seen = new Set<THREE.Skeleton>([sk.skeleton]);
    for (const m of skinned) { if (!m.skeleton || seen.has(m.skeleton)) continue; seen.add(m.skeleton); for (const b of moved) { const o = m.skeleton.bones.find((x) => x.name === b.name); if (o && o !== b) o.quaternion.copy(b.quaternion); } }
  }
  /**
   * HER RIGHT HAND POINTING (P4, pressing): each of its fingers with the closure TOUCH_BENCH.press gives it, named from the
   * pad on its last bone, and her index fingertip -- its bone and where on it the tip is.
   */
  function pointingHand(P: Readonly<Record<FingerName, readonly number[]>> = TOUCH_BENCH.press): { sk: THREE.SkinnedMesh; fingers: { f: Finger; name: FingerName; bend: readonly number[] }[]; tipBone: number; tip: THREE.Vector3; tipPoint: ContactPoint; surface: ContactSurface; points: { bone: number; at: THREE.Vector3; site: string }[] } | null {
    const c = contactsOf(); if (!c || !measure || !rig) return null;
    const local = contactLocalOf(c), bones = c.mesh.skeleton.bones;
    const out: { f: Finger; name: FingerName; bend: readonly number[] }[] = [], points: { bone: number; at: THREE.Vector3; site: string }[] = [];
    let tipBone = -1, tip: THREE.Vector3 | null = null, tipPoint: ContactPoint | null = null;
    for (const f of fingers) {
      if (!boneUnder(bones, f.joints[0], measure.joints.wristR)) continue;
      const end = f.joints[f.joints.length - 1], pad = c.set.points.findIndex((p) => p.bone === end && p.site.endsWith('Pad'));
      if (pad < 0) continue;
      const name = c.set.points[pad].site.replace('Pad', '') as FingerName;
      out.push({ f, name, bend: P[name] });
      c.set.points.forEach((p, i) => { if (p.side === 'R' && (p.bone === end || p.site === `${name}Tip`)) points.push({ bone: p.bone, at: local.get(i)!, site: p.site }); });
      if (name === 'index') { const t = c.set.points.findIndex((p) => p.bone === end && p.site === 'indexTip'); if (t >= 0) { tipBone = end; tip = local.get(t)!; tipPoint = c.set.points[t]; } }
    }
    return tip && tipPoint && tipBone >= 0 ? { sk: c.mesh, fingers: out, tipBone, tip, tipPoint, surface: c.surface, points } : null;
  }
  /** Her index fingertip's skin where it is drawn now (world): her skin, not its bone -- it is her skin that touches, and
   * skin is carried by more than the one bone under it. */
  const skinTipOf = (ph: NonNullable<ReturnType<typeof pointingHand>>) => ph.sk.localToWorld(ph.surface.evaluate(ph.tipPoint, new THREE.Vector3()));
  /**
   * Where her index fingertip is from her wrist once her hand points -- along her hand, out of her palm, and across (along
   * x palm), as her hand lies now (armJoints.handNow) -- metres of world. Her fingers are put back as they were.
   */
  function pointingTipOf(joints: ArmJoints, wr: number): { along: number; palm: number; across: number } | null {
    const ph = pointingHand(); if (!ph) return null;
    const bones = ph.sk.skeleton.bones, h0 = joints.handNow(), W0 = bones[wr].getWorldPosition(new THREE.Vector3());
    const keep = ph.fingers.flatMap((x) => x.f.joints).map((i) => [i, bones[i].quaternion.clone()] as const);
    for (const x of ph.fingers) bendFinger(bones, x.f, x.bend);
    ph.sk.updateMatrixWorld(true);
    const X = skinTipOf(ph).sub(W0);
    for (const [i, q] of keep) bones[i].quaternion.copy(q);
    bones[wr].updateMatrixWorld(true);
    return { along: X.dot(h0.along), palm: X.dot(h0.palm), across: X.dot(new THREE.Vector3().crossVectors(h0.along, h0.palm)) };
  }
  /** Her hand, laid by her arm, made to point: and how near the button her fingertip is, and the rest of her hand to it. */
  let pressLast: { tipMm: number; nearestMm: number; nearest: string } | null = null;
  function pressFingers(): void {
    pressLast = null;
    if (!touchHere() || touchTest !== 'button' || !touchShapes.button) return;
    const ph = pointingHand(); if (!ph) return;
    const bones = ph.sk.skeleton.bones;
    for (const x of ph.fingers) bendFinger(bones, x.f, x.bend);
    sameOnHerOthers(ph.sk, ph.fingers.flatMap((x) => x.f.joints.map((i) => bones[i])));
    const P = (v: THREE.Vector3): [number, number, number] => [v.x, v.y, v.z], shapes = [touchShapes.button, touchShapes.panel].filter((x): x is GripShape => !!x);
    ph.sk.updateMatrixWorld(true);
    const tip = skinTipOf(ph);
    // (each other point of her fingers' last bones: none of them in the panel)
    let nearest = Infinity, which = '';
    for (const p of ph.points) { if (p.site === 'indexTip') continue; const d = Math.min(...shapes.map((s) => shapeDistance(s, P(bones[p.bone].localToWorld(p.at.clone()))))); if (d < nearest) { nearest = d; which = p.site; } }
    pressLast = { tipMm: +(shapeDistance(touchShapes.button, P(tip)) / M * 1000).toFixed(1), nearestMm: +(nearest / M * 1000).toFixed(1), nearest: which };
  }
  /** Her hand held up at the SHOW bench, in the shape asked. */
  let showLast: Record<string, unknown> = {};
  function showFingers(): void {
    if (!touchHere() || touchTest !== 'show') return;
    const ph = pointingHand(showShape); if (!ph) return;
    const bones = ph.sk.skeleton.bones;
    showLast = {};
    for (const x of ph.fingers) bendFinger(bones, x.f, x.bend);
    // A FIST'S FINGERS CLOSED INTO HER PALM, not through it: each finger closed by its shape's bends, scaled back to where
    // its pad or tip first meets her palm (her full active range carried her ring finger's tip out through the back of
    // her hand)
    const palm = palmBoxOf(ph.sk);
    if (palm) for (const x of ph.fingers) {
      if (x.f.thumb || !(x.bend[0] > 0.5)) continue;
      // (its pad and its tip: the tip rides the end bone past its last joint, and closing, it is the tip that meets her palm)
      const pts = ph.points.filter((q) => q.site === `${x.name}Pad` || q.site === `${x.name}Tip`), v = new THREE.Vector3();
      if (!pts.length) continue;
      const scaled = (u: number) => x.bend.map((b, k) => (k < 3 ? b * u : b));
      const clear = (u: number) => { bendFinger(bones, x.f, scaled(u)); let m = Infinity; for (const q of pts) { bones[q.bone].localToWorld(v.copy(q.at)); m = Math.min(m, shapeDistance(palm, [v.x, v.y, v.z])); } return m; };
      const r = closeToTouch(clear, 1, 0.002 * M);
      showLast[x.name] = { closure: +r.closure.toFixed(3), touched: r.touched, points: pts.map((q) => q.site), at0: +(clear(0) / M * 1000).toFixed(1), at1: +(clear(1) / M * 1000).toFixed(1) };
      bendFinger(bones, x.f, scaled(r.closure));
    }
    sameOnHerOthers(ph.sk, ph.fingers.flatMap((x) => x.f.joints.map((i) => bones[i])));
  }
  /** Her right palm as she holds it now, as a box under its skin (P4): its top on her palm's middle, from the heel of her hand
   * to her knuckles, across her hand. */
  function palmBoxOf(sk: THREE.SkinnedMesh): GripShape | null {
    const c = contactsOf(); if (!c || !measure) return null;
    const bones = sk.skeleton.bones, wrist = measure.joints.wristR, w = (b: number) => bones[b].getWorldPosition(new THREE.Vector3());
    // (her palm's points as the bone of her hand carries them, as they were found: read on her skin, they move as her fingers
    // close -- her palm's skin is partly carried by her fingers' bones -- and a fist closed onto that closed through her hand)
    const local = contactLocalOf(c);
    const site = (k: string) => { const i = c.set.points.findIndex((q) => q.side === 'R' && q.site === k); return i >= 0 && local.get(i) ? bones[c.set.points[i].bone].localToWorld(local.get(i)!.clone()) : null; };
    const mid = site('palm'), heel = site('palmHeel'), thumb = fingers.find((f) => f.thumb && boneUnder(bones, f.joints[0], wrist));
    const others = fingers.filter((f) => !f.thumb && boneUnder(bones, f.joints[0], wrist));
    if (!mid || !heel || !thumb || others.length < 2) return null;
    const T = w(thumb.joints[0]), ks = others.map((f) => w(f.joints[0])).sort((a, b) => a.distanceTo(T) - b.distanceTo(T));
    const K = ks.reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(1 / ks.length);
    const along = K.clone().sub(w(wrist)).normalize(), across = ks[0].clone().sub(ks[ks.length - 1]);
    across.addScaledVector(along, -across.dot(along)).normalize();
    // (out of her palm, as findFingers finds it: a mirror image's cross product put right by her side -- not by which side
    // of her bones her palm's skin is, which her file's bones, lying near her palm, leave to chance)
    const n = new THREE.Vector3().crossVectors(along, across).normalize().multiplyScalar(Math.sign(rig?.bind[wrist]?.x ?? -1) || -1);
    const thick = 0.015 * M, a = heel.clone().sub(mid).dot(along), b = K.clone().sub(mid).dot(along);
    const centre = mid.clone().addScaledVector(n, -thick).addScaledVector(along, (a + b) / 2);
    const V = (x: THREE.Vector3): [number, number, number] => [x.x, x.y, x.z];
    return { kind: 'box', centre: V(centre), axes: [V(along), V(across), V(n)], half: [Math.abs(b - a) / 2, 0.05 * M, thick] };
  }
  /** Where her thumb's pad goes on the tablet (TOUCH_BENCH.tablet): on its screen, `thumbIn` in from its left edge, at
   * the height of the middle of her palm and `thumbUp` above it -- the web of her thumb round the edge. */
  function tabletThumbAt(): { at: THREE.Vector3; out: THREE.Vector3 } | null {
    const t = touchAt?.tablet; if (!t) return null;
    const Tt = TOUCH_BENCH.tablet;
    const at = t.centre.clone().addScaledVector(t.out, (Tt.thick / 2) * M).addScaledVector(t.across, (Tt.wide / 2 - Tt.thumbIn) * M).addScaledVector(t.up, -(Tt.tall / 2 - Tt.palmUp - Tt.thumbUp) * M);
    return { at, out: t.out.clone() };
  }
  /**
   * HER THUMB TURNED ONTO A PLACE (P4, a thumb over an edge -- a tablet's, a book's, a tray's): its base turned about the
   * way it folds across her palm, about the way it lifts out of it (toward what her palm holds) and about its own length
   * (turning its pad to the thing, as a thumb opposes), and its two outer
   * joints bent together, searched for the turn that puts its pad nearest `on.at` with none of the thumb in what she holds
   * -- coarsely over its whole reach, then finer round the best. Each turn within her thumb's own: its base folds back
   * `THUMB_ON.fold[0]` to across `fold[1]`, turns `lift` either way out of the way it folds and `twist` either way about
   * its length, its joints bend 0 to `bend` (radians).
   */
  function thumbOnto(sk: THREE.SkinnedMesh, f: Finger, padBone: THREE.Bone, padLocal: THREE.Vector3, padDepth: number, on: { at: THREE.Vector3; out: THREE.Vector3 }, dist: (p: [number, number, number]) => number): { miss: number; over: number; turns: number[] } {
    const bones = sk.skeleton.bones, O = THUMB_ON, base = f.joints[0], b0 = rig!.bind[base], b1 = rig!.bind[f.joints[1]];
    // (its way along at rest, and the way out of her palm there: the fold's axis crossed with it)
    const dir = new THREE.Vector3(b1.x - b0.x, b1.y - b0.y, b1.z - b0.z).normalize(), liftAxis = new THREE.Vector3().crossVectors(f.axis, dir).normalize();
    const q = new THREE.Quaternion(), qa = new THREE.Quaternion(), qt = new THREE.Quaternion(), axis = new THREE.Vector3(), v = new THREE.Vector3(), w = new THREE.Vector3();
    // (folded, lifted, and turned about its own length -- a thumb laid on a thing turns its pad to it)
    const set = (a: number, b: number, c: number, d = 0) => {
      q.setFromAxisAngle(liftAxis, b).multiply(qa.setFromAxisAngle(f.axis, a)).multiply(qt.setFromAxisAngle(dir, d));
      const ww = Math.min(1, Math.max(-1, q.w)), angle = 2 * Math.acos(ww), sn = Math.sqrt(Math.max(0, 1 - ww * ww));
      if (sn > 1e-9) axis.set(q.x / sn, q.y / sn, q.z / sn); else axis.copy(f.axis);
      rig!.set(f.joints.map((jt, k) => (k === 0 ? { joint: jt, ax: axis.x, ay: axis.y, az: axis.z, radians: angle } : { joint: jt, ax: f.axis.x, ay: f.axis.y, az: f.axis.z, radians: c })));
      bones[base].updateMatrixWorld(true);
    };
    const P = (x: THREE.Vector3): [number, number, number] => [x.x, x.y, x.z];
    // (as a thumb comes onto a thing: first to just over the place, anywhere it can reach, then down onto it from there,
    // none of it in the thing)
    let goal = on.at.clone().addScaledVector(on.out, O.over * M), inside = O.inside, turned = [0, 0, 0, 0];
    const cost = () => {
      padBone.localToWorld(v.copy(padLocal));
      let c = v.distanceTo(goal) / M;
      // (none of it in what she holds: each bone a capsule as thick as its pad is deep)
      // (its tip, past its pad, thinner)
      if (inside > 0) f.joints.forEach((jt, k) => { const a = bones[jt].getWorldPosition(w), kid = bones[jt].children.find((o) => (o as THREE.Bone).isBone); if (!kid) return; const e = kid.getWorldPosition(new THREE.Vector3()); for (const t of [0.5, 1]) { const d = dist(P(a.clone().lerp(e, t))) - padDepth * (k === f.joints.length - 1 && t === 1 ? O.tip : O.thick); if (d < 0) c += inside * (-d / M); } });
      // (and as little turned as will do: a thumb at ease)
      return c + O.ease * (Math.abs(turned[2]) + turned[3]);
    };
    const lo = [O.fold[0], -O.lift, -O.twist, 0], hi = [O.fold[1], O.lift, O.twist, O.bend], clamp = (x: number, k: number) => Math.min(hi[k], Math.max(lo[k], x));
    let best = { x: [0, 0, 0, 0], cost: Infinity };
    const tryAt = (x: number[]) => { set(x[0], x[1], x[2], x[3]); turned = x; const k = cost(); if (k < best.cost) best = { x: x.slice(), cost: k }; };
    const n = O.coarse;
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) for (let t = 0; t <= n; t++) for (let k = 0; k <= 3; k++) tryAt([lo[0] + (hi[0] - lo[0]) * i / n, lo[1] + (hi[1] - lo[1]) * j / n, lo[2] + (hi[2] - lo[2]) * t / n, hi[3] * k / 3]);
    const refine = (step: number[], rounds: number) => {
      for (let r = 0; r < rounds; r++) {
        const c0 = best.x.slice();
        for (const da of [-1, 0, 1]) for (const db of [-1, 0, 1]) for (const dt of [-1, 0, 1]) for (const dc of [-1, 0, 1]) tryAt([da, db, dt, dc].map((dd, k) => clamp(c0[k] + dd * step[k] / 2, k)));
        step = step.map((x) => x / 2);
      }
    };
    refine([0, 1, 2, 3].map((k) => (hi[k] - lo[k]) / (k === 3 ? 3 : n)), O.refine);
    // (then down onto it: the place itself, none of the thumb in the thing, from where it came over it)
    set(best.x[0], best.x[1], best.x[2], best.x[3]); padBone.localToWorld(v.copy(padLocal)); const over = v.distanceTo(goal) / M * 1000;
    // (lowered onto it a little at a time, as a thumb comes down on a thing: each pass's place a step nearer it)
    inside = O.inside;
    for (let pass = 1; pass <= O.down; pass++) {
      goal = on.at.clone().addScaledVector(on.out, HAND_GRIP.gap * M + O.over * M * (1 - pass / O.down));
      set(best.x[0], best.x[1], best.x[2], best.x[3]); turned = best.x; best.cost = cost();
      refine([0, 1, 2, 3].map((k) => (hi[k] - lo[k]) / (k === 3 ? 3 : n) / 4), O.refine);
    }
    set(best.x[0], best.x[1], best.x[2], best.x[3]);
    padBone.localToWorld(v.copy(padLocal));
    return { miss: v.distanceTo(on.at) / M * 1000, over, turns: best.x.map((x) => +x.toFixed(2)) };
  }
  function gripFingers(): void {
    gripLast = null;
    if (!touchHere() || !rig || !measure) return;
    // (round the cup her right hand; under the tablet her left)
    const holding = touchTest === 'cup' && touchShapes.cup ? { wrist: measure.joints.wristR, shapes: [touchShapes.cup, touchShapes.table], thumbOpen: TOUCH_BENCH.thumbOpen }
      : touchTest === 'tablet' && touchShapes.tablet ? { wrist: measure.joints.wristL, shapes: [touchShapes.tablet], thumbOpen: TOUCH_BENCH.tablet.thumbOpen, thumbOn: tabletThumbAt() } : null;
    if (!holding) return;
    const c = contactsOf(); if (!c) return;
    const sk = c.mesh, bones = sk.skeleton.bones, shapes: GripShape[] = (holding.shapes as (GripShape | undefined)[]).filter((x): x is GripShape => !!x), out: Record<string, number> = {};
    const dist = (p: [number, number, number]) => shapes.reduce((m, sh) => Math.min(m, shapeDistance(sh, p)), Infinity);
    const local = contactLocalOf(c);
    const under = (b: number, top: number) => boneUnder(bones, b, top);
    const P = (v: THREE.Vector3): [number, number, number] => [v.x, v.y, v.z];
    const moved: THREE.Bone[] = [];
    for (const f of fingers) {
      if (!under(f.joints[0], holding.wrist)) continue;
      const end = f.joints[f.joints.length - 1], pts = c.set.points.map((p, i) => ({ p, i })).filter((x) => x.p.bone === end && (x.p.site.endsWith('Pad') || x.p.site.endsWith('Tip')));
      // (her thumb ON a place, over an edge: turned to it, not closed into her palm -- thumbOnto)
      const on = 'thumbOn' in holding ? holding.thumbOn : null;
      if (f.thumb && on) {
        const pad = pts.find((x) => x.p.site.endsWith('Pad'));
        if (pad) { const r = thumbOnto(sk, f, bones[pad.p.bone], local.get(pad.i)!, pad.p.depth * M, on, dist); moved.push(...f.joints.map((jt) => bones[jt])); out.thumb = +r.miss.toFixed(1); out.thumbOver = +r.over.toFixed(1); out.thumbTouched = r.miss < 3 ? 1 : 0; gripJoints.thumb = r.turns; continue; }
      }
      const pad = pts.find((x) => x.p.site.endsWith('Pad')), thick = pad ? pad.p.depth * M : 0.008 * M;
      // (the thumb first opened away from her palm, about its base, to go round the far side of what she holds, then closed:
      // straight, it pointed into the cup; `thumbOpen` of its base's bend the other way, at most)
      const open = f.thumb ? holding.thumbOpen : 0;
      // each joint's closure (a share of its own full bend; the thumb's base opened below 0)
      const bend = f.joints.map(() => 0);
      const apply = () => bendFinger(bones, f, bend);
      // how near the shape one bone of the finger is: a capsule round it as thick as its pad is deep -- and the last, its pad
      // and tip on its skin
      const segment = (k: number) => {
        let least = Infinity; const v = new THREE.Vector3(), w = new THREE.Vector3();
        if (k === f.joints.length - 1) for (const x of pts) least = Math.min(least, dist(P(bones[x.p.bone].localToWorld(v.copy(local.get(x.i)!)))));
        const a = bones[f.joints[k]].getWorldPosition(v), kid = bones[f.joints[k]].children.find((o) => (o as THREE.Bone).isBone);
        if (kid) { kid.getWorldPosition(w); for (const t of [0.5, 1]) least = Math.min(least, dist(P(a.clone().lerp(w, t))) - thick); }
        return least;
      };
      const from = (k: number) => { let m = Infinity; for (let q = k; q < f.joints.length; q++) m = Math.min(m, segment(q)); return m; };
      // WRAPPED ROUND IT (a hand closing on a thing): every joint not yet stopped closes together until a bone of the finger
      // meets the thing; the joints up to that bone stop there and the ones past it close on, until each bone lies on it
      // or its joint is closed as far as it goes -- closed all at once and stopped at the first touch, the finger lay
      // straight along the cup
      let touched = false, k = 0;
      if (f.thumb) { bend[0] = -open; apply(); }
      while (k < f.joints.length) {
        const start = bend.slice();
        const r = closeToTouch((u) => { for (let q = k; q < f.joints.length; q++) bend[q] = start[q] + u * (1 - start[q]); apply(); return from(k); }, 1, 0.002 * M);
        for (let q = k; q < f.joints.length; q++) bend[q] = start[q] + r.closure * (1 - start[q]);
        apply();
        if (!r.touched) break;
        touched = true;
        // (the bone that met it: the nearest of those past k)
        let hit = k, near = Infinity; for (let q = k; q < f.joints.length; q++) { const c2 = segment(q); if (c2 < near - 1e-9) { near = c2; hit = q; } }
        k = hit + 1;
      }
      moved.push(...f.joints.map((jt) => bones[jt]));
      const name = pad ? pad.p.site.replace('Pad', '') : `f${f.joints[0]}`;
      out[name] = +bend.reduce((a, b) => a + b, 0).toFixed(2); out[name + 'Touched'] = touched ? 1 : 0;
      gripJoints[name] = bend.map((b) => +b.toFixed(2));
    }
    // (and every other skeleton of hers given the same finger turns)
    sameOnHerOthers(sk, moved);
    gripLast = out;
  }
  const gripJointsNow = () => gripJoints;

  /** The masses at rest, and their anchors to be read afresh (a jump, a new body, a bake). */
  function settleMasses(): void {
    for (const m of Object.values(masses)) Object.assign(m, restingMass());
    if (anchors) for (const a of Object.values(anchors)) a.primed = 0;
    for (const u of [jiggle.belly, jiggle.breastL, jiggle.breastR]) u.value.set(0, 0, 0);
    for (const k of jiggle.kickAt.value) k.w = 0;
  }

  /**
   * Her belly and breasts, every frame (softBody.ts): what her body does at each mass's anchor -- its acceleration from
   * where it is frame to frame, plus a walk's own bounce, which this walk-on-the-spot leaves out, and gravity as her
   * body leans -- in her own frame, steps each mass, and hands the shaders what her skin shows of it.
   */
  /**
   * Her belly's soft moves a step (softBody.ts): the rules read her lean from the way down in her frame against standing,
   * her baby's place in her womb, and how full her womb is; the springs ease there; the shaders read the result.
   */
  function stepBellySoft(dt: number): void {
    if (babyFrame) { jiggle.kickRest.value.copy(babyFrame.meshToRest); jiggle.kickUnits.value.setFromMatrix4(babyFrame.meshToRest).invert(); }
    if (softBaseZ === null) softBaseZ = bellyBaseZ();
    // her lean from standing (learnt as she stands; a probe may hold one)
    if (pose === 'stand') softUpright.lerp(softDown, Math.min(1, dt * 2)).normalize();
    const down = softHeld ? heldDown(softHeld.lean, softHeld.side) : softDown;
    // how full her womb is: her belly's size against full term, her babies' and their fluid's share, less once born
    const fullness = (bump / 100) * birthBellyShare * (babyRoot ? carriedShare(onChart(), body.babyWeight, babyCount) : 1);
    // her baby's place in her womb: lower sags her belly, further forward deepens it; settling into her pelvis in labour
    // it drops (and once born, it is out of her)
    let baby: { low: number; forward: number } | null = null;
    // (the baby whose turn it is: with twins, the second once the first is out)
    const r0 = babyRoots()[birthNow?.active ?? 0] ?? babyRoots()[0], mid = r0?.userData.mid as THREE.Vector3 | undefined;
    if (babyWomb && mid && !allOut(birthNow)) {
      const half = Math.max(0.05, sacRadius(babyWomb, 0, -1, 0)), deep = Math.max(0.05, sacRadius(babyWomb, 0, 0, 1));
      baby = { low: Math.max(0, (babyWomb.centre.y - mid.y) / half) + (birthNow ? 0.3 * birthNow.engage : 0), forward: Math.max(0, (mid.z - babyWomb.centre.z) / deep) };
    }
    softWant = softBellyWant(down, softUpright, baby, fullness, body.bellyFirmness, bellyFed);
    // her navel: pushed out by what is behind it, laid again as that moves (a few times a second at most)
    // (for her navel, a baby settled into her pelvis in labour counts as dropped all the way)
    // HER NAVEL: pressed by her pregnancy -- its weeks, her babies, her baby's place (for her navel a baby settled into her
    // pelvis in labour counts as dropped all the way), a contraction -- and once her baby is born, by what her womb left
    // (NAVEL AFTER BIRTH); a spring carries it there, a little past and back
    const born = allOut(birthNow);
    if (!born) { navelPress = navelPressure(pregnant() ? herWeek(bump, babyCount, pregnancy) : 0, babyRoot ? carriedShare(onChart(), body.babyWeight, babyCount) : 1, baby && birthNow ? { low: baby.low + 0.7 * birthNow.engage, forward: baby.forward } : baby, birthNow?.contraction ?? 0); navelPeak = birthNow ? Math.max(navelPeak, navelPress) : navelPress; navelBornFor = 0; }
    else { navelBornFor += dt; navelPress = navelAfterBirth(body.navelAfter, navelPeak, navelBornFor); }
    if (!navelSpring.primed) { navelSpring.x = navelPress; navelSpring.primed = true; }
    { const w = 2 * Math.PI * 1.4, steps = Math.max(1, Math.ceil(dt / 0.01)), h = dt / steps;
      for (let i = 0; i < steps; i++) { navelSpring.v += (w * w * (navelPress - navelSpring.x) - 2 * 0.65 * w * navelSpring.v) * h; navelSpring.x += navelSpring.v * h; } }
    if (navelSoft) navelSoft.out.value = Math.max(-0.1, Math.min(1.3, navelSpring.x));
    // her fitted clothes' navels with hers, as it moves (a kick, a contraction, her womb settling after the birth)
    if (navelSoft && navelLaid) for (const mesh of skinned) {
      const at = mesh.morphTargetDictionary?.[NAVEL_FLAT_TARGET], inf = mesh.morphTargetInfluences;
      if (at === undefined || !inf || !mesh.visible) continue;
      const x = navelForClothes(mesh);
      if (x === null || Math.abs((navelWorn.get(mesh) ?? NaN) - x) < 1e-3) continue;
      inf[at] = x; navelWorn.set(mesh, x);
    }
    const want = softOn ? softWant : { side: 0, sag: 0, depth: 0 };
    stepSoftBelly(softBelly, dt, want, fullness);
    // her pubic area: pressed as her baby's head comes under her pubic arch, a spring easing to it
    { const want = birthNow && vulva && pubicOn ? pubicPressWant(birthNow.down, birthNow.contraction) : 0, P = PUBIC_PRESS, w = 2 * Math.PI * P.hz, steps = Math.max(1, Math.ceil(dt / 0.01)), h = dt / steps;
      for (let i = 0; i < steps; i++) { pubicPress.v += (w * w * (want - pubicPress.x) - 2 * P.damping * w * pubicPress.v) * h; pubicPress.x += pubicPress.v * h; }
      if (vulva && (want > 0 || Math.abs(pubicPress.x) > 1e-5)) {
        pubicCentre ??= vulva.openingRest().add(new THREE.Vector3(0, P.up, P.out));
        jiggle.pubicAt.value.set(pubicCentre.x, pubicCentre.y, pubicCentre.z, pubicPress.x);
        { const d = tmp.set(0, -0.35, 1).normalize(); jiggle.pubicDir.value.set(d.x, d.y, d.z, P.wide); }
      } else { jiggle.pubicAt.value.w = 0; if (!birthNow) pubicCentre = null; } }
    // (no bump, nothing to move)
    const k = Math.min(1, Math.max(0, bump / 30));
    jiggle.bellySoft.value.set(softBelly.side * k, softBelly.sag * k, softBelly.depth * k, softBaseZ ?? 0.1);
  }
  /** a probe's held lean: the way down in her frame `lean` degrees forward of standing and `side` to her left */
  function heldDown(lean: number, side: number): THREE.Vector3 {
    const p0 = Math.asin(Math.max(-1, Math.min(1, softUpright.z))), r0 = Math.asin(Math.max(-1, Math.min(1, softUpright.x)));
    const p = p0 + (lean * Math.PI) / 180, r = r0 + (side * Math.PI) / 180;
    return new THREE.Vector3(Math.sin(r), -Math.cos(r) * Math.cos(p), Math.cos(r) * Math.sin(p));
  }
  /** where her front is without a bump (z, rest metres): the middle of her skin her belly's follow weight carries most */
  function bellyBaseZ(): number | null {
    const b = bodyOf(), j = b ? jiggleOfMesh(b.mesh) : null, sb = b ? shaped.find((x) => x.mesh === b.mesh) : undefined;
    if (!b || !j || !sb || !babyFrame) return null;
    const v = new THREE.Vector3(); let z = 0, w = 0;
    for (let i = 0; i < j.weights.length / 3; i++) { const wi = j.weights[i * 3]; if (wi < 0.5) continue; v.fromArray(sb.fields.basePos, i * 3).applyMatrix4(babyFrame.meshToRest); z += v.z * wi; w += wi; }
    return w > 0 ? z / w : null;
  }
  function feelMotion(dt: number): void {
    seated = sitMoving ? seatShare() : stepSeated(seated, pose === 'sit' ? 1 : 0, dt);
    applyMotion();
    const b = bodyOf();
    // (v3, on her skeleton: no belly to hang a mass from, but her womb's own soft body carries her babies)
    if (!anchors || !b || !(dt > 0)) { if (organs && organsGrowWomb && dt > 0) { feltBelly.set(0, 0, 0); stepBabies(dt); } return; }
    const meshQ = b.mesh.getWorldQuaternion(qMesh).invert();
    let walkUp = 0, walkSide = 0;
    if (pose === 'walk' && measure && rig) {
      const stride = humanStride(measure, 'walk', bump / 100) / rig.bindScale; // metres
      walkUp = walkBounceAccel((walked / stride) % 1, stride / WALK_SPEED);
      walkSide = walkSwayAccel((walked / stride) % 1, stride / WALK_SPEED);
    }
    // her left in the world, for the sway
    side.set(1, 0, 0).applyQuaternion(qSide.copy(meshQ).invert());
    const volume = bustVolume(bump, body.breastSize), milkL = body.milk * (body.milkBalance < 0 ? 1 + 0.4 * body.milkBalance / 100 : 1), milkR = body.milk * (body.milkBalance > 0 ? 1 - 0.4 * body.milkBalance / 100 : 1);
    const tunes = { belly: bellyTune(bump, body.bellyFirmness, body.babyWeight, body.bellyBounce, babyRoot ? carriedShare(onChart(), body.babyWeight, babyCount) : 1), breastL: breastTune(volume, milkL, body.breastFirmness, 'left', body.breastBounce), breastR: breastTune(volume, milkR, body.breastFirmness, 'right', body.breastBounce) };
    for (const key of ['belly', 'breastL', 'breastR'] as const) {
      const a = anchors[key];
      a.bone.localToWorld(tmp.copy(a.local)).sub(walkOffset).multiplyScalar(1 / M);
      accel.set(0, 0, 0);
      if (a.primed >= 1) {
        vel.copy(tmp).sub(a.p).divideScalar(dt);
        if (a.primed >= 2) accel.copy(vel).sub(a.v).divideScalar(dt);
        a.v.copy(vel);
        a.primed = Math.min(2, a.primed + 1);
      } else a.primed = 1;
      a.p.copy(tmp);
      accel.y += walkUp;
      accel.addScaledVector(side, walkSide);
      // world to her frame: the bone's turn since it was bound, and her mesh's own
      a.bone.getWorldQuaternion(qBone);
      toBody.copy(meshQ).multiply(qBone).multiply(qBind.copy(a.bind).invert()).invert().multiply(meshQ);
      feltAcceleration(accel, toBody, felt);
      const m = masses[key], t = tunes[key];
      stepMass(m, dt, felt.x, felt.y, felt.z, t);
      // the shaders get metres in her frame; the follow weights turn them into each mesh's units
      jiggle[key].value.set(m.x, m.y, m.z).multiplyScalar(t.gain);
      if (key === 'belly') { feltBelly.copy(felt); softDown.set(0, -1, 0).applyQuaternion(toBody).normalize(); }
    }
    stepBellySoft(dt);
    // her legs' tissue: each thigh and calf feels what its bone does there and lags it, as the belly does
    if (legAnchors) for (const key of ['thighL', 'thighR', 'calfL', 'calfR'] as const) {
      const a = legAnchors[key], t = key.startsWith('thigh') ? LEG_TUNE.thigh : LEG_TUNE.calf;
      a.bone.localToWorld(tmp.copy(a.local)).sub(walkOffset).multiplyScalar(1 / M);
      accel.set(0, 0, 0);
      if (a.primed >= 1) {
        vel.copy(tmp).sub(a.p).divideScalar(dt);
        if (a.primed >= 2) accel.copy(vel).sub(a.v).divideScalar(dt);
        a.v.copy(vel);
        a.primed = Math.min(2, a.primed + 1);
      } else a.primed = 1;
      a.p.copy(tmp);
      accel.y += walkUp; accel.addScaledVector(side, walkSide);
      a.bone.getWorldQuaternion(qBone);
      toBody.copy(meshQ).multiply(qBone).multiply(qBind.copy(a.bind).invert()).invert().multiply(meshQ);
      feltAcceleration(accel, toBody, felt);
      // (a leg's tissue holds its shape far more than a belly hangs: most of the lean's gravity taken back off)
      { const sup = qSide.copy(toBody); tmp.set(0, GRAVITY, 0).applyQuaternion(sup); const keepG = 1 - LEG_GRAVITY / GRAVITY_SHARE; felt.x -= keepG * GRAVITY_SHARE * tmp.x; felt.y -= keepG * GRAVITY_SHARE * (tmp.y - GRAVITY); felt.z -= keepG * GRAVITY_SHARE * tmp.z; }
      const m = legMasses[key];
      stepMass(m, dt, felt.x, felt.y, felt.z, t);
      jiggle[key].value.set(m.x, m.y, m.z).multiplyScalar(t.gain);
    }
    // THE VALVE: in SQUAT the pressure of her calf on her thigh builds (a spring, a little past and back); out of it, gone
    { const want = pose === 'squat' && birthContactOn ? 1 : 0;
      if (!want) { contactValve.x = 0; contactValve.v = 0; }
      else { const w = 2 * Math.PI * CONTACT_VALVE.hz, h = Math.min(dt, 0.05); contactValve.v += (w * w * (want - contactValve.x) - 2 * CONTACT_VALVE.damping * w * contactValve.v) * h; contactValve.x += contactValve.v * h; }
      contactValve.at += dt;
      if (Math.abs(contactValve.x - contactValve.applied) > (want ? CONTACT_VALVE.step : 1e-6) && contactValve.at > 0.08) { contactValve.at = 0; contactValve.applied = contactValve.x; applyLook(); } }
    stepBabies(dt);
  }
  /**
   * Her babies this step: carried by what carries them (her belly's mass; v3, her womb's own soft body), floating in their
   * fluid, moving, and placed.
   */
  function stepBabies(dt: number): void {
    if (organs && organsGrowWomb) { if (organs.womb) organs.wombMove(jiggle.belly.value); else jiggle.belly.value.set(0, 0, 0); }
    // a contraction: her womb drawn up and forward, and eased back
    if (birthNow && birthNow.contraction > 0) jiggle.belly.value.add(tmp.set(BIRTH_HEAD.lift[0], BIRTH_HEAD.lift[1], BIRTH_HEAD.lift[2]).multiplyScalar(birthNow.contraction));
    // her babies in their fluid: each lags what her body does a little, within the room it has (baby.ts `FLUID`)
    babyClock += dt; babyStepDt = dt;
    stepSkin(babySkin, birthNow ? 1 : 0, dt);
    babyFloats.forEach((f, i) => { const t = floatTune(babyRooms[i] ?? 0, body.babyFloat); stepMass(f, dt, feltBelly.x * t.gain, feltBelly.y * t.gain, feltBelly.z * t.gain, t); });
    // two babies floating toward each other meet and stay apart (along the line between their middles), the fluid taking it up
    const roots = babyRoots();
    for (let a = 0; a < babyFloats.length; a++) for (let b = a + 1; b < babyFloats.length; b++) {
      const A = babyFloats[a], B = babyFloats[b], ma = roots[a]?.userData.mid as THREE.Vector3 | undefined, mb = roots[b]?.userData.mid as THREE.Vector3 | undefined;
      if (!ma || !mb) continue;
      moveAxis.copy(mb).sub(ma).normalize();
      const closing = (A.x - B.x) * moveAxis.x + (A.y - B.y) * moveAxis.y + (A.z - B.z) * moveAxis.z, slack = 0.001;
      if (closing <= slack) continue;
      const fix = (closing - slack) / 2;
      A.x -= moveAxis.x * fix; A.y -= moveAxis.y * fix; A.z -= moveAxis.z * fix; B.x += moveAxis.x * fix; B.y += moveAxis.y * fix; B.z += moveAxis.z * fix;
      const vRel = (A.vx - B.vx) * moveAxis.x + (A.vy - B.vy) * moveAxis.y + (A.vz - B.vz) * moveAxis.z;
      if (vRel > 0) { const h = vRel / 2; A.vx -= moveAxis.x * h; A.vy -= moveAxis.y * h; A.vz -= moveAxis.z * h; B.vx += moveAxis.x * h; B.vy += moveAxis.y * h; B.vz += moveAxis.z * h; }
    }
    // their moves: each baby's under way runs on; its next comes when it is due (BABY KICKS: how often)
    roots.forEach((r, i) => {
      const m = babyMoveOf(i, r);
      if (m.t >= 0) {
        m.t += dt;
        if (m.t > moveLength(m.kind)) { m.t = -1; const n = nextMove(m.rnd, body.babyKicks, m.kind); m.next = n.inS; m.pending = n.kind; }
      } else if (!(kicksShare(body.babyKicks) > 0)) m.next = Infinity;
      else {
        if (!Number.isFinite(m.next)) { const n = nextMove(m.rnd, body.babyKicks); m.next = n.inS; m.pending = n.kind; }
        m.next -= dt;
        if (m.next <= 0) startMove(m, m.pending);
      }
    });
    placeBaby();
  }

  /** Her body (and all she has on) seen through, or as it was. */
  function ghost(on: boolean): void {
    // her, and whatever she wears that is laid in the room beside her (the cloth tee): not the floor, its ring or the stool
    three.traverse((n) => {
      const mesh = n as THREE.Mesh;
      if (!mesh.isMesh || mesh === floor || mesh === ring || mesh === stool || (babyHolder && isUnder(mesh, babyHolder))) return;
      for (const mat of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.Material[]) {
        const keep = mat.userData.ghostKeep as { transparent: boolean; opacity: number; depthWrite: boolean } | undefined;
        if (on && !keep) {
          mat.userData.ghostKeep = { transparent: mat.transparent, opacity: mat.opacity, depthWrite: mat.depthWrite };
          mat.transparent = true; mat.opacity = GHOST_OPACITY * mat.opacity; mat.depthWrite = false; mat.needsUpdate = true;
        } else if (on && keep && (!mat.transparent || mat.depthWrite)) {
          // a garment's own code may set it solid again (a fabric layer laid afresh): it stays seen through
          mat.transparent = true; mat.depthWrite = false; mat.needsUpdate = true;
        } else if (!on && keep) {
          mat.transparent = keep.transparent; mat.opacity = keep.opacity; mat.depthWrite = keep.depthWrite; mat.needsUpdate = true;
          delete mat.userData.ghostKeep;
        }
      }
    });
  }
  const isUnder = (o: THREE.Object3D, root: THREE.Object3D): boolean => { for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p === root) return true; return false; };

  /** SEE BABY on or off: fetched the first time, laid in her womb, her seen through. */
  /** Her baby fetched (once): it is what her belly makes room for, seen or not. */
  function loadBaby(): void {
    if (babyRoot || babyLoading || disposed) return;
    {
      babyLoading = true;
      void assets.loadModel(BABY_MODEL, () => new THREE.Object3D()).then((root) => {
        babyLoading = false;
        if (disposed || root.userData.isPlaceholder === true) { release(root); refresh(); return; }
        // (its own skin kept, drawn plain until its birth begins: babySkin.ts)
        let skinMap: THREE.Texture | null = null;
        root.traverse((n) => { const m = n as THREE.Mesh; if (!skinMap && m.isMesh) skinMap = (m.material as THREE.MeshStandardMaterial).map ?? null; });
        const mat = new THREE.MeshStandardMaterial({ map: skinMap, roughness: 0.55, metalness: 0 });
        patchSkin(mat, babySkin);
        // (giving a little where it crosses her opening: babySqueeze.ts)
        patchSqueeze(mat, babySqueeze);
        root.traverse((n) => { const m = n as THREE.Mesh; if (m.isMesh) { m.material = mat; m.frustumCulled = false; } });
        // the curl's own frame, in its units (the model's rest is the curl): its points, and its head to say which end
        root.updateMatrixWorld(true);
        const pts: number[] = [], v = new THREE.Vector3(), head = new THREE.Vector3();
        // (as skinned at rest: the packed file keeps its points quantized and its scale in the skin's binds)
        root.traverse((n) => { const m = n as THREE.Mesh; if (!m.isMesh) return; const a = m.geometry.getAttribute('position'); for (let i = 0; i < a.count; i++) { m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld); pts.push(v.x, v.y, v.z); } });
        root.getObjectByName(BABY_BONES.head)?.getWorldPosition(head);
        babyCurl = curlFrame(pts, head); babySolidOf = null; babyMoves = [];
        // its head's middle (model units): the cap of it furthest along its curl, a head's radius in from its crown
        { const c = babyCurl, hr = BIRTH_HEAD.radius * BABY_MODEL_LENGTH / BIRTH_HEAD.atLength, q = new THREE.Vector3();
          let top = -Infinity; for (let i = 0; i < pts.length; i += 3) top = Math.max(top, q.set(pts[i], pts[i + 1], pts[i + 2]).sub(c.centre).dot(c.long));
          const m = new THREE.Vector3(); let k = 0;
          for (let i = 0; i < pts.length; i += 3) { q.set(pts[i], pts[i + 1], pts[i + 2]); if (q.clone().sub(c.centre).dot(c.long) > top - 2 * hr) { m.add(q); k++; } }
          m.divideScalar(Math.max(1, k));
          birthHeadModel = m.addScaledVector(c.long, top - hr - m.clone().sub(c.centre).dot(c.long)); }
        // the bones a move turns, as the curl has them
        babyCurlRest = new Map();
        for (const n of [...BABY_BONES.leg.left, ...BABY_BONES.leg.right, ...BABY_BONES.arm.left, ...BABY_BONES.arm.right, ...BABY_BONES.back, BABY_BONES.neck]) { const b = root.getObjectByName(n); if (b) babyCurlRest.set(n, b.quaternion.clone()); }
        // its navel (BABY_NAVEL, measured on the model): where it is in its curl, and its points to follow it by
        babyNavel = { model: new THREE.Vector3().fromArray(BABY_NAVEL.curled.at) };
        root.traverse((n) => { const m = n as THREE.SkinnedMesh; if (m.isSkinnedMesh) pickNavel(m, BABY_NAVEL.curled); });
        // a sample of its points, to keep it inside her womb
        babyPoints = Float32Array.from(pts.filter((_, i) => Math.floor(i / 3) % 10 === 0));
        babyAll = Float32Array.from(pts);
        babyRoot = root; babyDirty = true;
        if (babyShown) showBaby(true);
        refresh();
        // ITS BODY STRAIGHT, FOR ITS BIRTH (2026-11-03, Joshua: "the baby's belly looks ripped and not smooth"): its
        // curl is baked into the model as its rest, folds and all where its thighs and arms pressed into its belly and
        // chest -- hidden curled, laid bare once its legs straighten coming down her canal. A second body, the same
        // newborn baked in the pose it is born in (arms at its sides, legs straight; `.scratch/baby/straight-pose.json`),
        // bound to the SAME bones: whatever pose they hold, each body is drawn from its own rest, and the straight one
        // is shown while it is born (`birthBody`). Fetched once the curled one is in.
        void assets.loadModel(BABY_STRAIGHT_MODEL, () => new THREE.Object3D()).then((s2) => {
          if (disposed || s2.userData.isPlaceholder === true || babyRoot !== root) { release(s2); return; }
          let sm: THREE.SkinnedMesh | null = null; s2.traverse((n) => { if (!sm && (n as THREE.SkinnedMesh).isSkinnedMesh) sm = n as THREE.SkinnedMesh; });
          const mesh = sm as THREE.SkinnedMesh | null; if (!mesh) return;
          s2.updateMatrixWorld(true);
          pickNavel(mesh, BABY_NAVEL.straight);
          const bones = mesh.skeleton.bones.map((b) => root.getObjectByName(b.name) as THREE.Bone | undefined);
          if (bones.some((b) => !b)) return;
          const ownMat = mat.clone(); patchSkin(ownMat, babySkin); patchSqueeze(ownMat, babySqueeze);
          const own = new THREE.SkinnedMesh(mesh.geometry, ownMat); own.name = 'baby-straight'; own.frustumCulled = false; own.visible = false;
          root.add(own); own.bind(new THREE.Skeleton(bones as THREE.Bone[], mesh.skeleton.boneInverses.map((m) => m.clone())), mesh.matrixWorld.clone());
          babyStraight.set(root, own);
          babyDirty = true; refresh();
        });
      });
    }
  }
  function showBaby(on: boolean): void {
    // (nothing to see while she is not pregnant: SEE BABY stays off, and looks it)
    if (on && !pregnant()) on = false;
    babyShown = on;
    if (on) loadBaby();
    if (on && babyRoot && babyFrame && !babyHolder) {
      babyHolder = new THREE.Object3D();
      babyHolder.matrixAutoUpdate = false; babyHolder.matrix.copy(babyFrame.matrix);
      babyFrame.bone.add(babyHolder);
      // the sac (amniotic, clear and blue) and round it the womb's wall
      babySac = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshStandardMaterial({ color: 0x9cc9e6, roughness: 0.15, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
      babyWall = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshStandardMaterial({ color: 0xd98a8a, roughness: 0.5, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.FrontSide }));
      babySac.renderOrder = 1; babyWall.renderOrder = 2;
      for (const m of [babySac, babyWall]) m.userData.unit = Float32Array.from(m.geometry.getAttribute('normal').array as Float32Array);
      babyHolder.add(babyRoot, babySac, babyWall, ...babyCopies, ...babyOwnSacs);
      babyKey = ''; babyDirty = true; babyFitAt = -Infinity;
    }
    if (babyHolder) babyHolder.visible = on;
    ghost(on && !!babyHolder);
    vulva?.seeWomb(xrayPct > 0 || (on && !!babyHolder));
    placeBaby();
  }
  function dropBabyHolder(): void {
    if (babyRoot) babyRoot.removeFromParent();
    for (const c of babyCopies) c.removeFromParent();
    for (const m of babyOwnSacs) { m.removeFromParent(); m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
    babyOwnSacs = [];
    for (const m of [babySac, babyWall]) if (m) { m.removeFromParent(); m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
    babySac = null; babyWall = null; babyWomb = null; babyPushField = null;
    for (const m of [...cordMeshes, ...placentaMeshes]) { m.removeFromParent(); m.geometry.dispose(); }
    cordMeshes = []; placentaMeshes = []; cordLaid = cordLaid.map(() => false);
    babyHolder?.removeFromParent(); babyHolder = null; babyFrame = null;
  }
  /**
   * Her belly's skin as drawn now (her shape fields and morphs, not her pose), in her rest metres: the front of her belly
   * and its sides, where her womb is. The candidates are found once on her rest shape, generously.
   */
  /**
   * The balloon's top is her womb (vulvaMesh.ts setWomb): as her baby's is laid round the sac while there is one
   * (`babyWomb`), else as her belly holds one at her week (baby.ts wombFromSkin) -- worked out again when her size moves.
   */
  let balloonWombKey = '';
  function layBalloonWomb(): void {
    if (!vulva || !babyFrame) return;
    // (not pregnant: her own womb, a small bulb of its own -- not one grown round a baby or read off her belly's size)
    if (!pregnant()) { if (balloonWombKey !== 'none') { balloonWombKey = 'none'; vulva.setWomb(null); roomForV2Womb(null); } return; }
    const sk = bodyOf()?.mesh.skeleton, bone = sk ? sk.bones.indexOf(babyFrame.bone) : -1;
    // (once her baby is born her womb shrinks back with her belly: laid round her belly as it now is, not round the baby
    // it held -- 2026-11-02, Joshua saw it through her skin in a few spots as her belly settled)
    const settled = birthBellyShare < 1;
    if (babyWomb && !settled) { if (balloonWombKey !== 'baby' || v2Womb !== babyWomb) roomForV2Womb(babyWomb); balloonWombKey = 'baby'; vulva.setWomb(babyWomb, bone); return; }
    // (keyed on her belly's skin as it is drawn, not only on the sliders: 2026-11-02, Joshua -- on a fresh load her womb
    // showed through her belly and her shirt until a pose was pressed: it had been laid round her belly as it was while
    // the room was still putting her shape on, and the sliders had not moved since)
    const skin = bellySkin();
    if (!skin) return;
    let sig = 0; for (let i = 0; i < skin.length; i += 3) sig += skin[i] * 1.3 + skin[i + 1] * 3.7 + skin[i + 2] * 7.1;
    const key = `${bump.toFixed(3)}|${birthBellyShare.toFixed(3)}|${babyCount}|${body.babyWeight.toFixed(2)}|${sig.toFixed(4)}`;
    if (key === balloonWombKey) return;
    balloonWombKey = key;
    // (and, settling, held further inside her than her skin, as a womb shrinking back is: not right under her belly)
    if (settled) for (let i = 0; i < skin.length; i += 3) skin[i + 2] -= BIRTH_WOMB_IN * (1 - birthBellyShare) / BIRTH_SHRINK;
    try { const w = wombFromSkin(skin, weekForBump(onChart(bump * birthBellyShare), babyCount)); vulva.setWomb(w, bone); roomForV2Womb(w); } catch (error) { console.error('[sarahlab] her womb for the balloon could not be laid', error); vulva.setWomb(null); roomForV2Womb(null); }
  }
  /** v2: her organs make room for her own womb as it was just laid (sarahlab/wombRoom.ts); nothing of her womb changes. */
  function roomForV2Womb(w: WombShape | null): void {
    v2Womb = w;
    if (!organs || organsGrowWomb) return;
    try { organs.setOuterWomb(w ? wombRoomOf(w) : null); } catch (error) { console.error("[sarahlab] her organs could not make room for her womb", error); organs.setOuterWomb(null); }
  }
  function bellySkin(): Float32Array | null {
    const b = bodyOf(), f = babyFrame;
    if (!b || !f) return null;
    const g = b.mesh.geometry, pos = g.getAttribute('position') as THREE.BufferAttribute, mp = g.morphAttributes.position ?? [], inf = b.mesh.morphTargetInfluences ?? [];
    const v = new THREE.Vector3();
    if (!babySkinAt) {
      const at: number[] = [];
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(f.meshToRest); if (Math.abs(v.x) < 0.26 && v.y > 0.78 && v.y < 1.25 && v.z > -0.07) at.push(i); }
      babySkinAt = Uint32Array.from(at);
    }
    const tiltAt = b.mesh.morphTargetDictionary?.[BELLY_MOTION.tilt], balance = balanceTiltWeight();
    const live = inf.map((w, k) => [k, k === tiltAt ? w - balance : w] as const).filter(([k, w]) => w !== 0 && mp[k]);
    // and how far each point moves for one unit of her DEPTH field (her shape fields are laid on her rest shape, so this
    // is what AUTO DEPTH would add): found once, by vertex
    const fields = shaped.find((s) => s.mesh === b.mesh)?.fields.fields.get(DEPTH_FIELD);
    if (!babyDepthOf && fields) { babyDepthOf = new Map(); for (let k = 0; k < fields.index.length; k++) babyDepthOf.set(fields.index[k], k); }
    const toRest = new THREE.Matrix3().setFromMatrix4(f.meshToRest), d = new THREE.Vector3();
    const out: number[] = [], depth: number[] = [];
    for (const i of babySkinAt) {
      v.fromBufferAttribute(pos, i);
      for (const [k, w] of live) { const m = mp[k]; v.x += w * m.getX(i); v.y += w * m.getY(i); v.z += w * m.getZ(i); }
      v.applyMatrix4(f.meshToRest);
      if (!(v.z > -0.03 && v.y < 1.23)) continue;
      out.push(v.x, v.y, v.z);
      const k = babyDepthOf?.get(i);
      if (k === undefined || !fields) d.set(0, 0, 0); else d.set(fields.pos[k * 3], fields.pos[k * 3 + 1], fields.pos[k * 3 + 2]).applyMatrix3(toRest);
      depth.push(d.x, d.y, d.z);
    }
    babySkinDepth = Float32Array.from(depth);
    return Float32Array.from(out);
  }
  /**
   * Her mesh's points to her rest metres, at her bind: the skin's bind (her file keeps its scale and offset in the skin's
   * inverse binds, the same for every bone) and the mesh's place in her model.
   */
  /**
   * Room between her thighs as she is posed (birthRoom.ts): worked out again whenever what she is posed as, or her shape,
   * changes -- read off her bones as they are this frame -- and laid on her as a shape field.
   */
  function keepBirthRoom(): void {
    const b = bodyOf(), sb = b ? shaped.find((x) => x.mesh === b.mesh) : undefined;
    if (!b || !sb || !model) return;
    if (!isBirthPose(pose) || (!birthRoomOn && !birthNormalsOn && !birthKneesOn)) { birthRoomFor = ''; return; }
    const shapeKey = sb.fields.last.split('|').filter((k) => !k.startsWith(BIRTH_ROOM_FIELD) && !k.startsWith(BIRTH_NORMALS_FIELD) && !k.startsWith(BIRTH_KNEES_FIELD) && !k.startsWith(BIRTH_CONTACT_FIELD) && !k.startsWith(KNEE_TURN_FIELD) && !k.startsWith(HIP_TURN_FIELD)).join('|');
    const sig = `${pose}|${JSON.stringify(birthTweak)}|${Math.round(bump)}|${birthRoomOn}|${birthNormalsOn}|${birthKneesOn}|${birthContactOn}|${kneeTurnOn}|${hipTurnOn}|${birthMaskOverride}|${shapeKey}`;
    if (sig === birthRoomFor) return;
    birthRoomFor = sig;
    // her shape without either of these first: each is worked out on her as she would be without it
    const bare = new Map(sb.fields.fields);
    bare.delete(BIRTH_ROOM_FIELD); bare.delete(BIRTH_NORMALS_FIELD); bare.delete(BIRTH_KNEES_FIELD); bare.delete(BIRTH_CONTACT_FIELD); bare.delete(KNEE_TURN_FIELD); bare.delete(HIP_TURN_FIELD);
    sb.fields = { ...sb.fields, fields: bare, last: '' };
    applyLook();
    model.updateMatrixWorld(true);
    const g = b.mesh.geometry;
    const map = new Map(bare);
    // her hips turned round first, on her bare shape: what follows smooths her as turned
    if (hipTurn && hipTurnHere()) {
      const P0 = (g.getAttribute('position') as THREE.BufferAttribute).array as Float32Array, N0 = (g.getAttribute('normal') as THREE.BufferAttribute).array as Float32Array;
      map.set(HIP_TURN_FIELD, hipTurn.compute(P0, N0));
      sb.fields = { ...sb.fields, fields: new Map(map), last: '' };
      applyLook();
      model.updateMatrixWorld(true);
    }
    const P = (g.getAttribute('position') as THREE.BufferAttribute).array as Float32Array, N = (g.getAttribute('normal') as THREE.BufferAttribute).array as Float32Array;
    if (birthRoom && birthRoomOn) map.set(BIRTH_ROOM_FIELD, birthRoom.compute(P));
    // (the hip's half-turn helps RECLINE; in SQUAT's deeper bend it cracked her: off there)
    if (birthNormals && halfByPose) birthNormals.setHalf(pose !== 'squat' && !hipTurnHere());
    if (birthNormals && birthNormalsOn) map.set(BIRTH_NORMALS_FIELD, birthNormals.compute(P, N, pose === 'squat' ? birthFillSquat : pose === 'recline' ? birthFillRecline : 0, pose === 'squat' ? squatPull : 0));
    // her knees turned round, on her shape with her groin's smoothing on (and her knees' smoothing worked out after, on it)
    if (kneeTurn && kneeTurnHere()) {
      sb.fields = { ...sb.fields, fields: new Map(map), last: '' };
      applyLook();
      model.updateMatrixWorld(true);
      const Pk = (g.getAttribute('position') as THREE.BufferAttribute).array as Float32Array, Nk = (g.getAttribute('normal') as THREE.BufferAttribute).array as Float32Array;
      map.set(KNEE_TURN_FIELD, kneeTurn.compute(Pk, Nk));
    }
    // her knees worked out on her shape WITH her groin's smoothing on (the two bands meet down her thighs: worked out
    // apart and added, the skin both reach was moved twice)
    if (birthKnees && birthKneesOn) {
      sb.fields = { ...sb.fields, fields: new Map(map), last: '' };
      applyLook();
      model.updateMatrixWorld(true);
      const P2 = (g.getAttribute('position') as THREE.BufferAttribute).array as Float32Array, N2 = (g.getAttribute('normal') as THREE.BufferAttribute).array as Float32Array;
      map.set(BIRTH_KNEES_FIELD, birthKnees.compute(P2, N2));
    }
    // and in SQUAT her calf and thigh pressed flat where they meet, on her shape with all of the above on
    if (birthContact && birthContactOn && pose === 'squat') {
      sb.fields = { ...sb.fields, fields: new Map(map), last: '' };
      applyLook();
      model.updateMatrixWorld(true);
      const P3 = (g.getAttribute('position') as THREE.BufferAttribute).array as Float32Array, N3 = (g.getAttribute('normal') as THREE.BufferAttribute).array as Float32Array;
      map.set(BIRTH_CONTACT_FIELD, birthContact.compute(P3, N3));
    }
    sb.fields = { ...sb.fields, fields: map, last: '' };
    applyLook();
  }

  function restOfMesh(mesh: THREE.SkinnedMesh, root: THREE.Object3D): THREE.Matrix4 {
    const sk = mesh.skeleton, bone = sk.bones[0];
    const skin = new THREE.Matrix4().copy(mesh.bindMatrixInverse).multiply(bone.matrixWorld).multiply(sk.boneInverses[0]).multiply(mesh.bindMatrix);
    return new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(mesh.matrixWorld).multiply(skin);
  }
  /**
   * Her belly made room for: each of her meshes that moves with her belly (her body and what she wears, all in her body's
   * geometry) pushed out where the field says, in its own units; a field with nothing in it takes any old push off.
   */
  function layPush(f: BellyPush): void {
    const frame = babyFrame;
    if (!frame) return;
    const toUnits = new THREE.Matrix3().setFromMatrix4(frame.meshToRest).invert();
    const v = new THREE.Vector3(), u = new THREE.Vector3();
    for (const mesh of skinned) {
      const j = jiggleOfMesh(mesh);
      if (!j) continue;
      if (f.most <= 0 || babyPushOff) { if (mesh.userData.pushed) { setPush(mesh, null); mesh.userData.pushed = false; } continue; }
      const g = mesh.geometry, pos = g.getAttribute('position') as THREE.BufferAttribute, mp = g.morphAttributes.position ?? [], inf = mesh.morphTargetInfluences ?? [];
      // the points that could be on her belly, found once a mesh (generously: the push says where it is wanted)
      let at = mesh.userData.pushAt as Uint32Array | undefined;
      if (!at) {
        const list: number[] = [];
        for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(frame.meshToRest); if (Math.abs(v.x) < 0.45 && v.y > 0.72 && v.y < 1.32 && v.z > -0.16) list.push(i); }
        at = mesh.userData.pushAt = Uint32Array.from(list);
      }
      const live = inf.map((w, k) => [k, w] as const).filter(([k, w]) => w !== 0 && mp[k]);
      const out = new Float32Array(pos.count * 3);
      for (const i of at) {
        v.fromBufferAttribute(pos, i);
        for (const [k, w] of live) { const m = mp[k]; v.x += w * m.getX(i); v.y += w * m.getY(i); v.z += w * m.getZ(i); }
        v.applyMatrix4(frame.meshToRest);
        if (!pushAt(f, v.x, v.y, v.z, u)) continue;
        u.applyMatrix3(toUnits);
        out[i * 3] = u.x; out[i * 3 + 1] = u.y; out[i * 3 + 2] = u.z;
      }
      setPush(mesh, out); mesh.userData.pushed = true;
    }
  }
  /** A shell on the sphere grid laid round the womb's middle at the sac's radius (plus `grow`). */
  function layShell(mesh: THREE.Mesh, w: WombShape, grow: number): void {
    const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute, unit = mesh.userData.unit as Float32Array;
    for (let i = 0; i < pos.count; i++) {
      const x = unit[i * 3], y = unit[i * 3 + 1], z = unit[i * 3 + 2], r = sacRadius(w, x, y, z) + grow;
      pos.setXYZ(i, w.centre.x + r * x, w.centre.y + r * y, w.centre.z + r * z);
    }
    pos.needsUpdate = true; mesh.geometry.computeVertexNormals(); mesh.geometry.computeBoundingSphere();
    mesh.userData.base = Float32Array.from(pos.array as Float32Array); mesh.userData.bumped = false;
  }
  /**
   * The baby, its sac, her womb and her belly round them (baby.ts): the baby at the chart's size; the sac grown round it;
   * her skin (and what she wears) pushed out where they need the room. Worked out again when her shape, size or BABY
   * WEIGHT change -- a few times a second at most while a slider is dragged -- seen or not; drawn only while shown.
   */
  function placeBaby(): void {
    if (!pregnant()) { notPregnant(); return; }
    if (!babyRoot) { loadBaby(); return; }
    if (!babyCurl || !babyPoints || !babyFrame) return;
    // (v3: and her womb as grown for her week -- grown on the frame her slider moved, which may be after this one)
    const key = `${bump.toFixed(2)}|${body.babyWeight.toFixed(2)}|${babyCount}|${babyLie}|${babyLieSeed}|${organs?.womb?.week.toFixed(2) ?? ''}`;
    // (three take longer to lay: they wait until the slider has stopped a moment)
    if (key !== babyKeySeen) { babyKeySeen = key; babyKeyAt = performance.now(); }
    const settled = performance.now() - babyKeyAt > (babyCount < 2 ? 150 : 280);
    if ((babyDirty || key !== babyKey) && settled && performance.now() - babyFitAt > 120) {
      babyKey = key; babyDirty = false;
      const fitStart = performance.now();
      babySolidOf ??= babySolid(babyAll ?? babyPoints, babyCurl);
      const lies = babyLies();
      let fits: BabyFit[];
      if (organs && organsGrowWomb) {
        // v3, on her skeleton: her womb grown from what it holds for her week (actor/pregnantWomb.ts) is the room they
        // have -- packed into its sac as the room packs them; there is no belly skin yet to push
        const sac = organs.sac();
        if (!sac) return;
        fits = packBabies(babyPoints, babySolidOf, onChart(), body.babyWeight, babyCurl, sac, lies).fits;
        // (the sac grown round them where they stand past it, and her womb's wall round that: they are never shrunk)
        babyWomb = growSac(sac, babiesPast(babyAll ?? babyPoints, fits, sac)); organs.fitSac(babyWomb);
        babyPushField = null; babyCurled = 1; babyBalanceDeg = 0;
      } else {
        const skin = bellySkin();
        if (!skin) return;
        // her skin as her own shape has it: the AUTO DEPTH already laid taken back off (it is worked out afresh)
        const unit = depthUnit(), depth = babySkinDepth && babySkinDepth.length === skin.length ? babySkinDepth : null;
        if (babyAutoDepth && depth) for (let i = 0; i < skin.length; i++) skin[i] -= babyAutoDepth * unit * depth[i];
        const them = babiesInHer(babyPoints, babyAll ?? babyPoints, babySolidOf, onChart(), body.babyWeight, babyCurl, skin, depth, unit, lies);
        fits = them.fits;
        babyWomb = them.womb; babyPushField = them.push; babyCurled = them.shrink; babyBalanceDeg = them.balance;
        // her belly deepened as they need (her shape fields laid again, only when it moved enough to see)
        if (Math.abs(them.depth - babyAutoDepth) > 0.25) { babyAutoDepth = them.depth; applyLook(); babyDirty = false; }
        layPush(babyPushField);
      }
      // as many babies as asked for: copies of the first, made or put away
      // (a copy's own place and drift: a clone's userData is copied as JSON, and a Vector3 there came back a plain object)
      while (babyCopies.length < fits.length - 1) { const c = cloneSkinned(babyRoot); c.userData = {}; babyCopies.push(c); }
      while (babyCopies.length > fits.length - 1) babyCopies.pop()?.removeFromParent();
      babyRoots().forEach((r, i) => {
        r.quaternion.copy(fits[i].quaternion); r.scale.setScalar(fits[i].scale); r.userData.at = fits[i].position; r.userData.lie = lies[i];
        // its turn as packed, and the middle of its curl it drifts round
        r.userData.turn = fits[i].quaternion.clone(); r.userData.mid = babyCurl!.centre.clone().multiplyScalar(fits[i].scale).applyQuaternion(fits[i].quaternion).add(fits[i].position);
        if (babyHolder && r.parent !== babyHolder) babyHolder.add(r);
      });
      // each in its fluid, with the room it has
      babyRooms = floatRoom(babyPoints, fits, babyWomb);
      // each its placenta, where the babies leave the lining room, near its navel; its cord laid afresh when they change
      const navels = fits.map((f) => babyNavel ? babyNavel.model.clone().multiplyScalar(f.scale).applyQuaternion(f.quaternion).add(f.position) : f.position.clone());
      babyPlacentas = placentaSpots(babyPoints, fits, babyWomb, weekForBump(onChart(), babyCount), navels);
      const wk = weekForBump(onChart(), babyCount);
      // (as thick as its navel at the size it is: BABY_NAVEL)
      if (babyCords.length !== fits.length) { babyCords = fits.map((f) => new Cord(cordLength(wk), BABY_NAVEL.radius * f.scale)); cordLaid = fits.map(() => false); }
      babyCords.forEach((c, i) => { c.length = cordLength(wk); c.radius = BABY_NAVEL.radius * fits[i].scale; });
      while (babyFloats.length < fits.length) babyFloats.push(restingMass());
      babyFloats.length = fits.length; babyMoves.length = Math.min(babyMoves.length, fits.length);
      // (the balloon's top is this same womb, laid again round it now -- seen or not: laid only while her baby had been
      // shown, a womb still at full term stayed in the balloon when her belly was slid down to nothing, and stood out of
      // her flat belly -- found 2026-11-04, checking the room on its own site)
      layBalloonWomb();
      if (babySac && babyWall) {
        layShell(babyWall, babyWomb, WOMB_WALL_M);
        // (drawn once, as the balloon)
        babyWall.visible = !vulva && !organs;
        // one baby: its sac lines her womb; several: each its own, round it
        layShell(babySac, babyWomb, 0); babySac.visible = fits.length === 1;
        while (babyOwnSacs.length < fits.length && fits.length > 1) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), (babySac.material as THREE.Material).clone()); m.renderOrder = 1; m.userData.unit = babySac.userData.unit; babyHolder?.add(m); babyOwnSacs.push(m); }
        while (babyOwnSacs.length > (fits.length > 1 ? fits.length : 0)) { const m = babyOwnSacs.pop()!; m.removeFromParent(); m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
        babyOwnSacs.forEach((m, i) => layShell(m, sacAround(babyPoints!, fits[i], babyCurl!), 0));
      }
      babyRoot.userData.fitMs = performance.now() - fitStart; babyFitAt = performance.now();
      refresh();
    }
    moveBabies();
    // (its cord stepped through its birth with SEE BABY off too: once its navel is out of her, it is seen outside her)
    if (!babyShown && birthNow && babyHolder) layCords();
    if (!babyShown || !babyHolder || !babySac || !babyWall) return;
    // the belly's mass carries what is in it (her frame, metres)
    babyRoots().forEach((r, i) => { const f = babyFloats[i], d = r.userData.drift as THREE.Vector3 | undefined; babyOwnSacs[i]?.position.copy(jiggle.belly.value).add(d ?? floatAt.set(0, 0, 0)).add(f ? floatAt.set(f.x, f.y, f.z) : floatAt.set(0, 0, 0)); });
    babySac.position.copy(jiggle.belly.value); babyWall.position.copy(jiggle.belly.value);
    layCords();
    // the lining gives where a kick reaches it (its wall and sac with her belly)
    for (const m of [babySac, babyWall]) bumpShell(m);
    // anything put on her since (a garment, the cloth tee) is seen through too
    ghost(true);
  }
  /**
   * Her babies placed in her (her rest frame, metres; under the holder when shown, on their own when not -- her belly
   * shows their kicks either way): each floating in its fluid -- lagging her a little, drifting and turning slowly round
   * its own middle -- rolling if it is, its limbs posed for its move; a foot or hand that reaches her womb's lining shows
   * on her belly (the kick uniforms), one that reaches into another baby nudges it.
   */
  /**
   * NOT PREGNANT (P5): everything of a pregnancy put away -- SEE BABY off, a birth taken back to before it began, its
   * kicks off her skin, its push and the depth her belly took for it taken off (her belly is the slider's approved shape
   * again), and the balloon's top her own small womb. Kept as it is from then on; PREGNANT ON lays it all again.
   */
  function notPregnant(): void {
    if (babyShown) showBaby(false);
    if (birthClock !== null) birthControl('reset');
    for (const k of jiggle.kickAt.value) k.w = 0;
    if (babyPushField) { if (babyPushField.most > 0) layPush({ ...babyPushField, most: 0 }); babyPushField = null; }
    if (babyAutoDepth !== 0) { babyAutoDepth = 0; applyLook(); }
    babyWomb = null; babyKey = ''; babyDirty = true;
    layBalloonWomb();
  }
  function moveBabies(): void {
    const roots = babyRoots(), K = jiggle.kickAt.value, D = jiggle.kickDir.value;
    // (each one's pose put back as it was given, before it is posed again: its soft body is laid over it after)
    for (const r of roots) { const sb = softBabies.get(r); if (sb) restorePose(sb); }
    for (const k of K) k.w = 0;
    if (babyFrame) { jiggle.kickRest.value.copy(babyFrame.meshToRest); jiggle.kickUnits.value.setFromMatrix4(babyFrame.meshToRest).invert(); }
    if (babyHolder) babyHolder.updateMatrixWorld(true);
    const toWorld = babyHolder && babyHolder.parent ? babyHolder.getWorldQuaternion(moveQ) : moveQ.identity();
    roots.forEach((r, i) => {
      const at = r.userData.at as THREE.Vector3 | undefined, turn = r.userData.turn as THREE.Quaternion | undefined, mid = r.userData.mid as THREE.Vector3 | undefined;
      if (!at || !turn || !mid || !babyCurl) return;
      const angle = floatDrift(babyClock, i, babyRooms[i] ?? 0, floatMove, floatAxis, body.babyFloat), f = babyFloats[i], m = babyMoveOf(i, r);
      const k = m.t >= 0 ? moveEnvelope(m.kind, m.t) : 0;
      floatTurn.setFromAxisAngle(floatAxis, angle);
      // a roll: about its own length, and back
      if (m.t >= 0 && m.kind === 'roll') floatTurn.premultiply(moveRoll.setFromAxisAngle(moveAxis.copy(babyCurl.long).applyQuaternion(turn).normalize(), ROLL_RAD * k * (m.side === 'left' ? 1 : -1)));
      r.quaternion.copy(floatTurn).multiply(turn);
      r.position.copy(at).sub(mid).applyQuaternion(floatTurn).add(mid).add(floatMove).add(jiggle.belly.value);
      if (f) r.position.add(floatAt.set(f.x, f.y, f.z));
      (r.userData.drift ??= new THREE.Vector3()).copy(floatMove);
      // (its straight body while it is born: faded in over its curled one as its legs straighten coming down -- both
      // bodies half-bent there, alike -- and from then on through its birth and on her)
      // (each baby its own birth, one after another: P3)
      const bm = birthReaches(i) ? momentOf(i) : null;
      {
        const sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
        const legs = bm ? sm(0.3, 0.9, bm.engage) * sm(0.2, 1, bm.down) : 0;
        birthBody(r, !bm ? 0 : bm.down >= 1 ? 1 : sm(BABY_BODY_FADE[0], BABY_BODY_FADE[1], legs));
      }
      // being born: down her canal, where the birth has it now (its moves wait)
      if (bm && birthPlace(r, i)) {
        r.updateMatrixWorld(true);
        // born, it stretches out of its curl (and back)
        const mv = babyMoveOf(i, r), k2 = bm.stretch, k3 = bm.onHer;
        // (made long as it settles into her pelvis and comes down, until it is born and stretches, lifted onto her)
        const e1 = Math.min(1, Math.max(0, (bm.engage - 0.3) / 0.6)), k1 = e1 * e1 * (3 - 2 * e1) * (1 - k3) * (1 - k2);
        if (k1 > 0 || k2 > 0 || k3 > 0 || mv.posed) {
          mv.posed = k1 > 0 || k2 > 0 || k3 > 0; mv.t = -1;
          const q = r.getWorldQuaternion(moveRoll);
          moveFrame.long.copy(babyCurl.long).applyQuaternion(q); moveFrame.front.copy(babyCurl.back).negate().applyQuaternion(q); moveFrame.left.copy(babyCurl.side).applyQuaternion(q);
          moveFrame.out.copy(moveFrame.front).negate();
          poseMove(mv.bones, mv.rest, 'stretch', 'left', k2, moveFrame);
          { const dn = Math.min(1, Math.max(0, (bm.down - 0.2) / 0.8)); poseDescent(mv.bones, k1, moveFrame, k1 * dn * dn * (3 - 2 * dn)); }
          // and lifted onto her, out of its curl and lying over her -- or, a triplet's third, on its back in the bassinet
          if (inBassinet(i)) poseCradle(mv.bones, k3, moveFrame);
          else poseOnHer(mv.bones, k3, moveFrame);
          // or in her arms (P2, position B: one baby)
          if (cradleShare > 0 && !inBassinet(i)) poseCradle(mv.bones, k3 * cradleShare * cradleShare * (3 - 2 * cradleShare), moveFrame);
          // (and round the bend of her canal, what of it is in her)
          birthAlong(r, i, bm, mv.bones, k1);
        }
        return;
      }
      r.updateMatrixWorld(true);
      // its limbs: posed while it moves, back to its curl once after
      if (!(k > 0) && !m.posed) return;
      m.posed = k > 0;
      const q = r.getWorldQuaternion(moveRoll);
      moveFrame.long.copy(babyCurl.long).applyQuaternion(q); moveFrame.front.copy(babyCurl.back).negate().applyQuaternion(q); moveFrame.left.copy(babyCurl.side).applyQuaternion(q);
      // the way out of her womb from it: away from her womb's middle, and forward (her belly is in front)
      moveFrame.out.copy(mid).sub(babyWomb?.centre ?? mid).add(moveAxis.set(0, 0, 0.12)).normalize().applyQuaternion(toWorld);
      // THE LINING STOPS IT: a limb reaches only as far as her womb's lining gives (`KICK_MOST_M` past it) -- the move held
      // short, by halving, where it would go further
      const pad = 0.012 * (r.scale.x / 0.33), w = babyWomb;
      const restOf = (b: THREE.Object3D, out: THREE.Vector3) => { b.getWorldPosition(out); if (babyHolder && r.parent === babyHolder) babyHolder.worldToLocal(out); return out.sub(jiggle.belly.value); };
      const pastAt = (tipBone: THREE.Object3D | null): number => {
        if (!tipBone || !w) return -Infinity;
        let worst = -Infinity;
        for (let b: THREE.Object3D | null = tipBone, n = 0; b && n < 3; b = b.parent, n++) worst = Math.max(worst, liningPast(w, restOf(b, moveAt), pad));
        return worst;
      };
      const allowed = KICK_MOST_M - KICK_FELT_M;
      let tip = poseMove(m.bones, m.rest, m.kind, m.side, k, moveFrame);
      if (tip && w && pastAt(tip) > allowed) {
        let lo = 0, hi = k;
        for (let it = 0; it < 6; it++) { const mid2 = (lo + hi) / 2; tip = poseMove(m.bones, m.rest, m.kind, m.side, mid2, moveFrame); if (pastAt(tip) > allowed) hi = mid2; else lo = mid2; }
        tip = poseMove(m.bones, m.rest, m.kind, m.side, lo, moveFrame);
      }
      if (!tip || !babyWomb) return;
      // where the tip is in her rest frame, her womb's own place (the belly's swing taken off)
      restOf(tip, moveTip);
      const amp = kickOnSkin(babyWomb, moveTip, 0.012 * (r.scale.x / 0.33), moveAt, moveOut);
      if (amp > 0 && i < K.length) { K[i].set(moveAt.x, moveAt.y, moveAt.z, amp); D[i].set(moveOut.x, moveOut.y, moveOut.z, KICK_WIDE_M * Math.min(1.2, Math.max(0.6, r.scale.x / 0.33))); }
      // into another baby: it is nudged away, and the fluid takes it up
      if (babySolidOf) roots.forEach((o, j) => {
        if (j === i || !babyFloats[j]) return;
        const local = moveAt.copy(moveTip).add(jiggle.belly.value).sub(o.position).applyQuaternion(moveQ.copy(o.quaternion).invert()).divideScalar(o.scale.x).sub(babyCurl!.centre);
        const deep = solidDeep(babySolidOf!, local.x, local.y, local.z) * o.scale.x;
        if (deep <= 0) return;
        moveAxis.copy(moveTip).sub(mid).normalize();
        const F = babyFloats[j]; F.vx += moveAxis.x * deep * 4; F.vy += moveAxis.y * deep * 4; F.vz += moveAxis.z * deep * 4;
      });
    });
    softenBabies(roots);
  }
  /**
   * Each baby's soft body over the pose just given it (softBaby.ts): its back, arms and legs swinging a little behind
   * its motion, floating in her womb, hanging under their weight once born -- and whenever an automatic move poses it (a
   * kick or a roll or a stretch, its birth, being lifted onto her), driven by that move outright.
   */
  function softenBabies(roots: readonly THREE.Object3D[]): void {
    softFrame++;
    // (and where it crosses her opening, it gives a little: babySqueeze.ts)
    // (v2 with her skeleton's opening: where it gives is her doors, at their seat -- not her skin's own opening above them)
    setSqueeze(babySqueeze, babySoftOn && birthNow ? (vulva && !seatOpening() ? vulva.passFrame() : organs && birthNow.down > BIRTH_DOORS_FROM ? v3PassFrame() : null) : null, M);
    // (the first baby's settle state is the one loaded between frames: each other baby's is swapped in for its turn)
    roots.forEach((r, i) => { if (i > 0) useSettleOf(i); try {
      const m = babyMoveOf(i, r);
      let sb = softBabies.get(r);
      if (!sb) { sb = createSoftBaby(m.bones, BABY_SOFT_CHAINS); softBabies.set(r, sb); }
      // (each baby by its own birth; on her -- not one in the bassinet, which lies on its mattress)
      const b = birthReaches(i) ? momentOf(i) : null, onHerK = b && !inBassinet(i) ? b.onHer : 0;
      if (!babySoftOn) { sb.ready = false; sb.drive = 1; if (b && onHerK > 0.5) { onHerPush(r); liftOffHer(r, onHerK * (1 - cradleShare)); } return; }
      // what drives it: a move under way; its birth from its settling into her pelvis until it lies on her; a stretch
      let drive = m.t >= 0 ? Math.min(1, 4 * moveEnvelope(m.kind, m.t)) : 0;
      if (b) {
        const lying = b.onHer >= 1 && b.stretch < 0.02;
        if (b.engage > 0.3 && !lying) drive = 1;
        // (lying on her, its pose held mostly: she half sits up, and left to its springs its legs hung down her belly; in
        // her arms more again, its arms folded on its chest)
        if (lying) drive = Math.max(drive, ON_HER_SKIN.hold + (1 - ON_HER_SKIN.hold) * 0.75 * cradleShare);
      }
      // in her womb's fluid until its body is out of her
      const fluid = !b || b.down < 1.6 ? 1 : 0;
      r.updateMatrixWorld(true);
      const push = b && onHerK > 0.5 ? onHerPush(r) : undefined;
      stepSoftBaby(sb, babyStepDt, { drive, fluid, down: babyDown, ...(push ? { push } : {}) });
      // LYING ON HER, ALL OF IT ON HER SKIN (2026-11-03, Joshua: "It appears the baby's head is in her belly?"): its
      // place on her is laid from its curl's size, and posed on her -- its head turned, its back straight -- its head
      // sank into her. Its points sampled as drawn now; the deepest of them into her skin is how far it is lifted off
      // her, eased, its head laid on her by its neck, so it rests on her
      liftOffHer(r, push ? onHerK * (1 - cradleShare) : 0);
    } finally { keepSettleOf(i); } });
    if (roots.length > 1) useSettleOf(0);
  }
  /**
   * LYING ON HER, ITS ARMS AND LEGS ON HER SKIN, NOT IN IT (2026-11-03): her skin under it sampled (every few points of
   * her within `ON_HER_SKIN.reach` of it, chosen again when it has moved), each frame where it is drawn and which way it
   * faces; a joint that would go into her is put back `margin` out from the nearest of it, along its face.
   */
  let babyLift = new THREE.Vector3();
  const liftWant = new THREE.Vector3(), liftNrm = new THREE.Vector3(), liftP = new THREE.Vector3(), liftAll = new THREE.Vector3();
  let babyPitch = 0, pitchPick: { chest: Uint32Array; hips: Uint32Array } | null = null, pitchFor: THREE.SkinnedMesh | null = null;
  function settlePitch(r: THREE.Object3D, m: THREE.SkinnedMesh, share: number): void {
    const bones = m.skeleton.bones;
    if (!pitchPick || pitchFor !== m) {
      pitchFor = m;
      const SI = m.geometry.getAttribute('skinIndex'), SW = m.geometry.getAttribute('skinWeight'), c: number[] = [], h: number[] = [];
      for (let i = 0; i < SI.count; i += 3) { let b = 0, w = -1; for (let k = 0; k < 4; k++) if (SW.getComponent(i, k) > w) { w = SW.getComponent(i, k); b = SI.getComponent(i, k); } const nm = bones[b]?.name; if (nm === 'Bone_003' || nm === 'Bone_002' || nm === 'Bone_004') c.push(i); else if (nm === BABY_BONES.root || nm === BABY_BONES.hips || nm === 'Bone_006') h.push(i); }
      pitchPick = { chest: Uint32Array.from(c), hips: Uint32Array.from(h) };
    }
    const hipB = r.getObjectByName(BABY_BONES.hips), neckB = r.getObjectByName(BABY_BONES.neck); if (!hipB || !neckB) return;
    // (its pitch from last frame put on first: birthPlace laid its place afresh)
    const turnBy = (deg: number) => {
      const H = hipB.getWorldPosition(new THREE.Vector3()), Nk = neckB.getWorldPosition(new THREE.Vector3()), mid = H.clone().add(Nk).multiplyScalar(0.5);
      const long = Nk.clone().sub(H).normalize(), face = new THREE.Vector3(); { const [b] = nearestHerSkin(mid); if (b >= 0) face.fromArray(herSkin.nrm, b * 3); else face.set(0, 1, 0); }
      const axis = new THREE.Vector3().crossVectors(long, face.negate()); if (axis.lengthSq() < 1e-10) return; axis.normalize();
      const q = new THREE.Quaternion().setFromAxisAngle(axis, (deg * Math.PI) / 180), parent = r.parent;
      // (about its middle, in the world; back into its holder's frame)
      const wq = r.getWorldQuaternion(new THREE.Quaternion()), wp = r.getWorldPosition(new THREE.Vector3());
      wq.premultiply(q); wp.sub(mid).applyQuaternion(q).add(mid);
      if (parent) { parent.updateMatrixWorld(true); const pq = parent.getWorldQuaternion(new THREE.Quaternion()).invert(); r.quaternion.copy(pq.multiply(wq)); r.position.copy(parent.worldToLocal(wp)); }
      else { r.quaternion.copy(wq); r.position.copy(wp); }
      r.updateMatrixWorld(true);
    };
    const gap = (pick: Uint32Array): number => { m.skeleton.update(); let least = Infinity; const p = new THREE.Vector3(); for (const q of pick) { m.getVertexPosition(q, p); m.localToWorld(p); const [b] = nearestHerSkin(p); if (b < 0) continue; least = Math.min(least, (p.x - herSkin.pos[b * 3]) * herSkin.nrm[b * 3] + (p.y - herSkin.pos[b * 3 + 1]) * herSkin.nrm[b * 3 + 1] + (p.z - herSkin.pos[b * 3 + 2]) * herSkin.nrm[b * 3 + 2]); } return least; };
    if (babyPitch !== 0) turnBy(babyPitch);
    // (the turn that brings its chest as near her as its hips: its chest down by their difference over its length)
    const gc = gap(pitchPick.chest), gh = gap(pitchPick.hips);
    if (!Number.isFinite(gc) || !Number.isFinite(gh)) return;
    const len = hipB.getWorldPosition(new THREE.Vector3()).distanceTo(neckB.getWorldPosition(new THREE.Vector3()));
    const step = Math.max(-5, Math.min(5, (Math.atan2(gc - gh, Math.max(1e-6, len)) * 180) / Math.PI)) * share;
    const k = 1 - Math.exp(-Math.max(0, babyStepDt) / ON_HER_SKIN.liftEase);
    const next = Math.max(-ON_HER_SKIN.pitchMost, Math.min(ON_HER_SKIN.pitchMost, babyPitch + step * k));
    turnBy(next - babyPitch); babyPitch = next;
  }
  let liftPick: Uint32Array | null = null, liftFor: THREE.SkinnedMesh | null = null, liftLeast = Infinity, liftWho = -1;
  function liftOffHer(r: THREE.Object3D, share: number): void {
    const parent = r.parent;
    // (what was added last frame taken off first: birthPlace lays its place afresh each frame, but a held birth does not)
    liftWant.set(0, 0, 0);
    let mesh: THREE.SkinnedMesh | null = null; r.traverse((o) => { const m = o as THREE.SkinnedMesh; if (!mesh && m.isSkinnedMesh && m.visible) mesh = m; });
    const m = mesh as THREE.SkinnedMesh | null, n = herSkin.idx.length;
    // TIPPED TO LIE ALONG HER (2026-11-03, Joshua: "is it floating?"): its chest and its hips each measured against her
    // skin, and all of it turned about its side, through its middle, until both are as near her -- a straight body on her
    // round belly touched her at its hips alone, its chest held up. The turn eased and kept from frame to frame
    if (share > 0 && m && n > 0) settlePitch(r, m, share); else babyPitch = 0;
    if (share > 0 && m && n > 0) {
      // (its trunk only: its head is laid on her by its neck, below, and its arms and legs keep themselves on her skin -- softBaby's push -- and its knees, folded
      // under it, held all of it up off her)
      if (!liftPick || liftPick.length === 0 || liftFor !== m) {
        liftFor = m;
        // (a limb's or its head's: any bone under a shoulder, a hip or its neck)
        const tops = [BABY_BONES.arm.left[0], BABY_BONES.arm.right[0], BABY_BONES.leg.left[0], BABY_BONES.leg.right[0], BABY_BONES.neck];
        const notTrunk = new Set(m.skeleton.bones.map((bn, bi) => { for (let q: THREE.Object3D | null = bn; q; q = q.parent) if (tops.includes(q.name)) return bi; return -1; }).filter((bi) => bi >= 0));
        const SI = m.geometry.getAttribute('skinIndex'), SW = m.geometry.getAttribute('skinWeight'), c = SI.count, a: number[] = [];
        for (let i = 0; i < c; i += 4) { let limb = 0; for (let k = 0; k < 4; k++) if (notTrunk.has(SI.getComponent(i, k))) limb += SW.getComponent(i, k); if (limb < 0.3) a.push(i); }
        liftPick = Uint32Array.from(a);
      }
      m.skeleton.update(); r.updateMatrixWorld(true);
      const margin = ON_HER_SKIN.margin * M; let deepest = 0; liftLeast = Infinity; liftWho = -1;
      liftNrm.set(0, 0, 0); liftAll.set(0, 0, 0);
      for (const q of liftPick) {
        m.getVertexPosition(q, liftP); m.localToWorld(liftP);
        const [best, bd] = nearestHerSkin(liftP);
        if (best < 0 || bd > (ON_HER_SKIN.near * M) ** 2) continue;
        const nx = herSkin.nrm[best * 3], ny = herSkin.nrm[best * 3 + 1], nz = herSkin.nrm[best * 3 + 2];
        const over = (liftP.x - herSkin.pos[best * 3]) * nx + (liftP.y - herSkin.pos[best * 3 + 1]) * ny + (liftP.z - herSkin.pos[best * 3 + 2]) * nz;
        const deep = margin - over;
        if (deep > 0) { liftNrm.x += nx * deep; liftNrm.y += ny * deep; liftNrm.z += nz * deep; if (deep > deepest) { deepest = deep; liftWho = q; } }
        // (how far its belly floats over her: the least gap of its points that face her)
        if (over < liftLeast) liftLeast = over;
        liftAll.x += nx; liftAll.y += ny; liftAll.z += nz;
      }
      if (deepest > 0 && liftNrm.lengthSq() > 1e-18) liftWant.copy(liftNrm.normalize()).multiplyScalar(deepest * share);
      // AND DOWN ONTO HER where none of it touches (P2; Joshua, 2026-11-04: "the baby is floating over her belly... make
      // sure it... actually is resting on her live belly"): as her belly settles smaller after the birth and flattens as
      // she lies back, the nearest of its trunk is brought down to her skin, along her skin's face under it
      else if (Number.isFinite(liftLeast) && liftLeast > margin && liftAll.lengthSq() > 1e-18) { liftWant.copy(liftAll.normalize()).multiplyScalar(-(liftLeast - margin) * share); if (liftNrm.lengthSq() === 0) liftNrm.copy(liftAll); }
    }
    // (into the holder's frame: it is what the baby's place is in)
    if (parent) { parent.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(parent.matrixWorld).invert(), o = new THREE.Vector3().applyMatrix4(inv); liftWant.applyMatrix4(inv).sub(o); }
    // (up at once, down slowly: never into her for a frame)
    const k = 1 - Math.exp(-Math.max(0, babyStepDt) / ON_HER_SKIN.liftEase);
    babyLift.lerp(liftWant, liftWant.lengthSq() > babyLift.lengthSq() && liftWant.dot(liftAll) >= 0 ? 1 : k);
    if (babyLift.lengthSq() > 0) { r.position.add(babyLift); r.updateMatrixWorld(true); }
    // ALL OF IT DRAPED OVER HER (2026-11-03, Joshua: "is it floating?"): lifted by its trunk, a straight body on her
    // round belly touched her at its hips alone, its chest, head and legs held up off her. Each part in turn -- its
    // upper back, its chest, its neck; each thigh, each shin -- bent toward her (about its side, its end down her skin's
    // face) until the nearest point it carries is on her skin, at most `ON_HER_DRAPE` degrees, eased
    if (m && share > 0 && n > 0) drapeOverHer(r, m, share);
    else drapeAt.clear();
  }
  let drapeAt = new Map<string, number>(), drapePick = new Map<string, Uint32Array>(), drapeFor: THREE.SkinnedMesh | null = null;
  function drapeOverHer(r: THREE.Object3D, m: THREE.SkinnedMesh, share: number): void {
    const bones = m.skeleton.bones;
    // (each part's points: those its bone or any below it carries most, every third)
    if (drapeFor !== m) {
      drapeFor = m; drapePick.clear();
      const SI = m.geometry.getAttribute('skinIndex'), SW = m.geometry.getAttribute('skinWeight');
      for (const [name, , , carried] of ON_HER_DRAPE) {
        const set = new Set(carried), a: number[] = [];
        for (let i = 0; i < SI.count; i += 3) { let b = 0, w = -1; for (let k = 0; k < 4; k++) if (SW.getComponent(i, k) > w) { w = SW.getComponent(i, k); b = SI.getComponent(i, k); } if (set.has(bones[b]?.name ?? '')) a.push(i); }
        drapePick.set(name, Uint32Array.from(a));
      }
    }
    const margin = ON_HER_SKIN.margin * M, p = new THREE.Vector3();
    const gapOf = (pick: Uint32Array): number => {
      m.skeleton.update(); let least = Infinity;
      for (const q of pick) { m.getVertexPosition(q, p); m.localToWorld(p); const [best, bd] = nearestHerSkin(p); if (best < 0) { void bd; continue; }
        least = Math.min(least, (p.x - herSkin.pos[best * 3]) * herSkin.nrm[best * 3] + (p.y - herSkin.pos[best * 3 + 1]) * herSkin.nrm[best * 3 + 1] + (p.z - herSkin.pos[best * 3 + 2]) * herSkin.nrm[best * 3 + 2]); }
      return least;
    };
    const face = liftNrm.lengthSq() > 0 ? liftNrm.clone() : new THREE.Vector3(0, 1, 0);
    const k = 1 - Math.exp(-Math.max(0, babyStepDt) / ON_HER_SKIN.liftEase);
    for (const [name, most, childName, , away = 0] of ON_HER_DRAPE) {
      const bone = bones.find((x) => x.name === name), child = r.getObjectByName(childName), pick = drapePick.get(name);
      if (!bone || !child || !pick || !pick.length) continue;
      const B = bone.getWorldPosition(new THREE.Vector3()), along = child.getWorldPosition(new THREE.Vector3()).sub(B).normalize();
      const axis = new THREE.Vector3().crossVectors(along, face.clone().negate()); if (axis.lengthSq() < 1e-10) continue; axis.normalize();
      const keep = bone.quaternion.clone();
      const turn = (deg: number) => { const q = new THREE.Quaternion().setFromAxisAngle(axis, (deg * Math.PI) / 180), pq = bone.parent ? bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert() : new THREE.Quaternion(), wq = bone.getWorldQuaternion(new THREE.Quaternion()); bone.quaternion.copy(pq.multiply(q).multiply(wq)); bone.updateMatrixWorld(true); };
      // (searched: the bend at which it just meets her, by halving, from none to the most; none if it is on her already)
      // (and where it goes into her -- its head, once its back has bent down -- back away from her, up to `away`)
      let want = 0;
      const g0 = gapOf(pick);
      if (g0 > margin) {
        let lo = 0, hi: number = most;
        for (let it = 0; it < 6; it++) { const mid = (lo + hi) / 2; bone.quaternion.copy(keep); bone.updateMatrixWorld(true); turn(mid); if (gapOf(pick) > margin) lo = mid; else hi = mid; }
        want = lo;
      } else if (g0 < margin && away > 0) {
        let lo = -away, hi = 0;
        for (let it = 0; it < 7; it++) { const mid = (lo + hi) / 2; bone.quaternion.copy(keep); bone.updateMatrixWorld(true); turn(mid); if (gapOf(pick) < margin) hi = mid; else lo = mid; }
        want = lo;
      }
      const was = drapeAt.get(name) ?? 0, now = was + (want * share - was) * k;
      drapeAt.set(name, now);
      bone.quaternion.copy(keep); bone.updateMatrixWorld(true);
      if (Math.abs(now) > 0.05) turn(now);
    }
  }
  /** her skin's sample in cells `near` across (built once a frame), and the nearest of it to a point within one cell */
  let skinGrid = new Map<string, number[]>(), skinGridFrame = -1;
  function nearestHerSkin(p: THREE.Vector3): [number, number] {
    const cell = ON_HER_SKIN.near * M;
    if (skinGridFrame !== herSkin.frame) {
      skinGridFrame = herSkin.frame; skinGrid.clear();
      for (let k = 0; k < herSkin.idx.length; k++) { const key = `${Math.floor(herSkin.pos[k * 3] / cell)},${Math.floor(herSkin.pos[k * 3 + 1] / cell)},${Math.floor(herSkin.pos[k * 3 + 2] / cell)}`; let a = skinGrid.get(key); if (!a) { a = []; skinGrid.set(key, a); } a.push(k); }
    }
    const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell), cz = Math.floor(p.z / cell);
    let best = -1, bd = Infinity;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let l = -1; l <= 1; l++) {
      const a = skinGrid.get(`${cx + i},${cy + j},${cz + l}`); if (!a) continue;
      for (const k of a) { const dx = herSkin.pos[k * 3] - p.x, dy = herSkin.pos[k * 3 + 1] - p.y, dz = herSkin.pos[k * 3 + 2] - p.z, d2 = dx * dx + dy * dy + dz * dz; if (d2 < bd) { bd = d2; best = k; } }
    }
    return [best, bd];
  }
  interface HerSkin { at: THREE.Vector3; idx: Uint32Array; pos: Float32Array; nrm: Float32Array; frame: number }
  let herSkin: HerSkin = { at: new THREE.Vector3(Infinity, 0, 0), idx: new Uint32Array(0), pos: new Float32Array(0), nrm: new Float32Array(0), frame: -1 };
  /**
   * TWINS ON HER (P3): each baby that lies on her is settled onto her skin as the first one always was -- tipped to lie
   * along her, lifted off her or brought down to her, its parts draped over her, its arms and legs kept off her skin --
   * each with its own of that state. The code above runs for one baby at a time: `useSettleOf(i)` loads baby i's into it
   * and `keepSettleOf(i)` puts it back (the first baby's stays loaded between frames, which is what one baby always had).
   */
  interface Settle { pitch: number; lift: THREE.Vector3; least: number; who: number; drapeAt: Map<string, number>; drapePick: Map<string, Uint32Array>; drapeFor: THREE.SkinnedMesh | null; liftPick: Uint32Array | null; liftFor: THREE.SkinnedMesh | null; pitchPick: { chest: Uint32Array; hips: Uint32Array } | null; pitchFor: THREE.SkinnedMesh | null; skin: HerSkin; grid: Map<string, number[]>; gridFrame: number }
  const settles: Settle[] = [];
  function keepSettleOf(i: number): void {
    settles[i] = { pitch: babyPitch, lift: babyLift, least: liftLeast, who: liftWho, drapeAt, drapePick, drapeFor, liftPick, liftFor, pitchPick, pitchFor, skin: herSkin, grid: skinGrid, gridFrame: skinGridFrame };
  }
  function useSettleOf(i: number): void {
    const t = settles[i] ?? { pitch: 0, lift: new THREE.Vector3(), least: Infinity, who: -1, drapeAt: new Map(), drapePick: new Map(), drapeFor: null, liftPick: null, liftFor: null, pitchPick: null, pitchFor: null, skin: { at: new THREE.Vector3(Infinity, 0, 0), idx: new Uint32Array(0), pos: new Float32Array(0), nrm: new Float32Array(0), frame: -1 }, grid: new Map(), gridFrame: -1 };
    babyPitch = t.pitch; babyLift = t.lift; liftLeast = t.least; liftWho = t.who; drapeAt = t.drapeAt; drapePick = t.drapePick; drapeFor = t.drapeFor;
    liftPick = t.liftPick; liftFor = t.liftFor; pitchPick = t.pitchPick; pitchFor = t.pitchFor; herSkin = t.skin; skinGrid = t.grid; skinGridFrame = t.gridFrame;
  }
  let softFrame = 0;
  function onHerPush(r: THREE.Object3D): ((from: THREE.Vector3, dir: THREE.Vector3, length: number) => boolean) | undefined {
    const mesh = bodyOf()?.mesh; if (!mesh) return undefined;
    const C = r.getWorldPosition(new THREE.Vector3()), reach = ON_HER_SKIN.reach * M, g = mesh.geometry, P = g.getAttribute('position'), Nn = g.getAttribute('normal');
    mesh.updateMatrixWorld(true);
    if (herSkin.at.distanceTo(C) > ON_HER_SKIN.again * M) {
      // (her points near it, from her as she is drawn now: every `every`th)
      const keep: number[] = [], v = new THREE.Vector3();
      for (let i = 0; i < P.count; i += ON_HER_SKIN.every) { clothingVertex(mesh, i, v); mesh.localToWorld(v); if (v.distanceTo(C) < reach) keep.push(i); }
      herSkin.idx = Uint32Array.from(keep); herSkin.pos = new Float32Array(keep.length * 3); herSkin.nrm = new Float32Array(keep.length * 3); herSkin.at.copy(C); herSkin.frame = -1;
    }
    if (herSkin.frame !== softFrame) {
      herSkin.frame = softFrame;
      const v = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
      // (her skin AS DRAWN -- with what the shaders add, her soft belly's shape and swing and her navel: read without them
      // her belly stood higher than it is drawn, flattened as she reclines, and her baby lay on that, floating over her,
      // Joshua 2026-11-04 -- clothingPose.ts, as her clothes read her)
      herSkin.idx.forEach((q, k) => { clothingVertex(mesh, q, v); mesh.localToWorld(v); v.toArray(herSkin.pos, k * 3); if (Nn) { v.fromBufferAttribute(Nn, q).applyMatrix3(nm).normalize(); v.toArray(herSkin.nrm, k * 3); } });
    }
    const n = herSkin.idx.length, margin = ON_HER_SKIN.margin * M, tip = new THREE.Vector3(), nv = new THREE.Vector3();
    if (n === 0) return undefined;
    return (from, dir, length) => {
      tip.copy(from).addScaledVector(dir, length);
      const [best] = nearestHerSkin(tip);
      if (best < 0) return false;
      nv.fromArray(herSkin.nrm, best * 3);
      const over = (tip.x - herSkin.pos[best * 3]) * nv.x + (tip.y - herSkin.pos[best * 3 + 1]) * nv.y + (tip.z - herSkin.pos[best * 3 + 2]) * nv.z;
      if (over >= margin) return false;
      tip.addScaledVector(nv, margin - over);
      dir.copy(tip).sub(from).normalize();
      return true;
    };
  }
  /**
   * A twin's or triplet's straight body (P3): the first baby's, on this one's own bones, with its own material (each fades
   * in on its own as it is born); made when first asked for.
   */
  function straightOf(r: THREE.Object3D): THREE.SkinnedMesh | undefined {
    const known = babyStraight.get(r);
    if (known || !babyRoot || r === babyRoot) return known;
    const src = babyStraight.get(babyRoot);
    if (!src) return undefined;
    let own: THREE.SkinnedMesh | null = null;
    r.traverse((o) => { if (!own && o.name === 'baby-straight' && (o as THREE.SkinnedMesh).isSkinnedMesh) own = o as THREE.SkinnedMesh; });
    const mat = (src.material as THREE.MeshStandardMaterial).clone(); patchSkin(mat, babySkin); patchSqueeze(mat, babySqueeze);
    let made = own as THREE.SkinnedMesh | null;
    if (!made) {
      const bones = src.skeleton.bones.map((b) => r.getObjectByName(b.name) as THREE.Bone | undefined);
      if (bones.some((b) => !b)) return undefined;
      made = new THREE.SkinnedMesh(src.geometry, mat); made.name = 'baby-straight'; made.frustumCulled = false; made.visible = false;
      r.add(made); made.bind(new THREE.Skeleton(bones as THREE.Bone[], src.skeleton.boneInverses.map((m) => m.clone())), src.bindMatrix.clone());
    } else made.material = mat;
    made.userData.share = undefined;
    babyStraight.set(r, made);
    return made;
  }
  /** Which of its two bodies is drawn: curled (its rest, in her womb) or straight (being born; see BABY_STRAIGHT_MODEL),
   * and between, the straight one faded in over the curled one (2026-11-03, Joshua: no jump as one becomes the other
   * with SEE BABY on) -- in front of it by a hair, so the two do not fight where they lie together. */
  function birthBody(r: THREE.Object3D, share: number): void {
    const own = straightOf(r); if (!own) return;
    const k = Math.min(1, Math.max(0, share)), m = own.material as THREE.MeshStandardMaterial, fading = k > 0 && k < 1;
    if (own.userData.share === k) return; own.userData.share = k;
    own.visible = k > 0;
    if (m.transparent !== fading) { m.transparent = fading; m.depthWrite = !fading; m.polygonOffset = fading; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -4; m.needsUpdate = true; }
    m.opacity = fading ? k : 1;
    r.traverse((o) => { if (o !== own && (o as THREE.SkinnedMesh).isSkinnedMesh) o.visible = k < 1; });
  }
  /** Her baby's head's radius (rest metres) at the size it is drawn (`scale`: rest metres a model unit). */
  const headRadiusOf = (scale: number): number => BIRTH_HEAD.radius * (scale * BABY_MODEL_LENGTH) / BIRTH_HEAD.atLength;
  /** How far down her canal her baby's head's middle is (metres from the top of her cervix; past `length`, out of her). */
  const headDownOf = (m: BirthMoment, length: number, scale: number): number => (m.down <= 1 ? m.down * length : length + (m.down - 1) * scale * BABY_MODEL_LENGTH);
  /** How its head and shoulders turn (birthSequence.ts `BirthTurn`): on her skeleton as most births go (Joshua,
   * 2026-11-08: "Accurate on v3"); on v2 all of it inside her (2026-11-03). */
  const birthTurn = (): BirthTurn => (!vulva && organs ? 'accurate' : 'inside');
  /**
   * X-RAY (Joshua, 2026-11-08, Phase 1 step 5, agreeing "Good to build it that way": "an X-RAY switch to the v3 room now.
   * Her bones turn see-through, with a slider for how much. The womb, baby, canal, opening and bladder stay solid"): every
   * mesh of her model but her organs (their holder, 'pelvicOrgans') and her baby drawn see-through by `xrayPct` -- each
   * with its own see-through copy of its material, made once and kept, its solid one put back at 0. Her belly skin, when
   * it comes, is one of her meshes and goes see-through with them.
   */
  /** What her gut holds, as her organs are drawn from it; and set by hand (the room's sliders, probes). */
  function gutFill() { return drawnFill(gut); }
  function setGut(next: GutState): void { gut = next; abdomen?.setFill(gutFill()); organs?.setBladder(gut.bladderMl); refresh(); }
  /**
   * v2: HER ORGANS LAID IN HER (the new direction's step 2, Joshua 2026-11-09: "Port all organs... lock... to real bone
   * landmarks"). Her pelvic organs (bladder, cervix and canal; her womb's small self while she is not pregnant) and her
   * belly's (stomach, intestines, colon, rectum, kidneys and ureters), laid from her skeleton's measured landmarks as they
   * stand in v2 (src/data/pelvis/v2.json, src/data/torso/v2.json: MEASURED on the skeleton, carried into her with the bone
   * round each point) and hung from her own bones -- anchored, not rigid (the port's rule 3). Her womb is her body's own:
   * none is grown here, and these make room for hers (`roomForV2Womb`). Her opening's doors are laid but not drawn while
   * v2 keeps its own opening. Built when X-RAY is first raised: they are only seen through her.
   */
  /** Her doors' seat in v2 as it is tried (a probe changes it, `doorsSeat`): how far out along her canal from her skin's
   * measured opening their canal begins (metres; the canal's own inset, ORGAN_PLACE.openingInset, is taken from it), their
   * size shut, whether the skeleton's ring of outer skin is drawn round them, their lining's colour, and `bone`: seated as
   * on her skeleton, under her pubic bone by her bones (actor/birthCanal.ts seatedCanal), not from her skin's opening. */
  // (`skin`: her own skin stretched down to her doors over the sleeve, actor/skinSeat.ts; `drawn`: the sleeve itself still
  // drawn under it, in her skin's tone -- what shows wherever her own skin does not reach, behind her where the tube
  // comes out through skin that is not the area's)
  const v2Seat: { out: number; restScale: number; ring: boolean; lining: number; bone: boolean; skin: boolean; drawn: boolean } = { out: 0, restScale: V2_DOORS.restScale, ring: true, lining: V2_DOORS.lining, bone: false, skin: true, drawn: true };
  function layOrgansV2(all = true): void {
    if (!v2OrganBones || (organs && (abdomen || abdomenFailed || !all))) return;
    const f = v2OrganBones;
    try {
      if (!organs) {
        organsGrowWomb = false;
        // (her doors' seat: her skin's opening as measured, or -- a probe trying another -- moved `out` along her canal)
        const seat = v2Seat, o = v2Pelvis.landmarks.opening, c = v2Pelvis.midpelvis.centre, l = Math.hypot(o[1] - c[1], o[2] - c[2]) || 1;
        const { opening: _skin, ...boneMarks } = v2Pelvis.landmarks; void _skin;
        const pelvisNow = seat.bone ? { ...v2Pelvis, landmarks: boneMarks } : seat.out === 0 ? v2Pelvis : { ...v2Pelvis, landmarks: { ...v2Pelvis.landmarks, opening: [o[0], o[1] + ((o[1] - c[1]) / l) * seat.out, o[2] + ((o[2] - c[2]) / l) * seat.out] } };
        organs = new PelvicOrgansView(pelvisNow, v2Torso, f.pelvis.bone, f.pelvis.matrix, M);
        // (in v2 the skin round her doors is her own, carried down to them: drawn as a sleeve round her canal, up into her
        // -- pelvicOrgansView.ts `skinSleeve`)
        organs.outerSkinShown = seat.ring && (seat.drawn || !seat.skin);
        // (under her own skin it is what shows of her inside between her doors' ends: drawn from its inside, as her lining)
        organs.sleeveUnderSkin = seat.ring && seat.skin;
        // (and her opening opens by BIRTH OPENING whether or not she is pregnant, as v2's own does)
        organs.opensFreely = true;
        organs.restScale = seat.restScale;
        organs.setOpening(birthOpenPct / 100); organs.setFold(foldBackPct / 100); organs.setBladder(gut.bladderMl);
        three.add(organs.group);
        roomForV2Womb(v2Womb);
        applyOpening();
      }
      // (her belly's and her chest's organs only once she is seen through: X-RAY)
      if (!all) { refresh(); return; }
    } catch (error) { console.error('[sarahlab] her pelvic organs could not be laid in her', error); organs?.dispose(); organs = null; v2OrganBones = null; applyOpening(); refresh(); return; }
    // (each on its own: one that cannot be built leaves the others, and is not tried again)
    try {
      abdomen = new AbdomenView(v2Pelvis, v2Torso, f, M, organs!);
      abdomen.setFill(gutFill());
      three.add(abdomen.group);
    } catch (error) { console.error("[sarahlab] her belly's organs could not be laid in her", error); abdomen?.dispose(); abdomen = null; abdomenFailed = true; }
    try {
      // (her lungs, heart and diaphragm in her rib cage, carried by her chest: built new in v2)
      if (!thorax && !thoraxFailed) { thorax = new ThoraxView(v2Thorax as unknown as ThoraxLandmarks, f.chest, M); three.add(thorax.group); }
    } catch (error) { console.error('[sarahlab] her lungs and heart could not be laid in her', error); thorax?.dispose(); thorax = null; thoraxFailed = true; }
    refresh();
  }
  /**
   * HER OPENING AS IT IS SWITCHED (`skeletonOpening`): her skeleton's doors drawn at her opening unless something is worn
   * over it, in her skin's tone there; v2's own opening's rim, lips and canal given up to them (vulvaMesh.ts
   * setSkeletonOpening) -- or all of it v2's again. Her pelvic organs are drawn whenever her doors are (her canal is behind
   * them), and under X-RAY.
   */
  /**
   * v2: whether her skeleton's doors are drawn now. Shut, they lie under her own skin (which is not flat there, and moves
   * with her legs as they do not), so shut she is her own skin, closed, as v2 is; they are drawn once her opening has
   * begun to open (`V2_DOORS.from` of BIRTH OPENING), and never under what she wears.
   */
  function doorsSeen(): boolean { return skeletonOpening && !!vulva && !organsGrowWomb && !vulva.dressed && vulva.drawnOpen > V2_DOORS.from; }
  function applyOpening(): void {
    const mine = skeletonOpening && !!organs && !organsGrowWomb && !!vulva, look = OPENING_LOOKS[openingLook % OPENING_LOOKS.length];
    vulva?.setSkeletonOpening(mine, { lips: look.lips, tint: look.tint, reach: look.reach });
    // (and her own canal -- what her baby comes down -- held by her bone: its top at the middle of her pelvis, where the
    // skeleton's canal has it)
    vulva?.setCanalTop(mine ? new THREE.Vector3(v2Pelvis.midpelvis.centre[0], v2Pelvis.midpelvis.centre[1], v2Pelvis.midpelvis.centre[2]) : null);
    if (organs && !organsGrowWomb) {
      // (her skin's colour as it is seen, a screen's: so read -- and where her skin is ONE colour, skinChoices.ts EVEN,
      // that colour itself: her doors' outsides are her skin carried down over them)
      const tone = skinWorn === 'even' ? hexRgb(EVEN_SKIN_COLOUR).map((v) => v / 255) : look.skin;
      organs.setDoorSkin(new THREE.Color().setRGB(tone[0] * look.tint[0], tone[1] * look.tint[1], tone[2] * look.tint[2], THREE.SRGBColorSpace), v2Seat.lining);
      organs.visible = (mine || xrayPct > 0) && !organsOff;
      // (behind her doors only her canal: her womb and bladder only while she is seen through)
      organs.innerShown = xrayPct > 0;
      organs.doorsShown = mine && doorsSeen();
    }
  }
  function applyXray(): void {
    if (!model) return;
    const share = organs || skeletonV2 ? Math.min(1, Math.max(0, xrayPct / 100)) : 0, opacity = Math.max(0.06, 1 - 0.94 * share);
    // (v2: her skeleton and her organs inside her drawn solid, and only while she is seen through)
    if (skeletonV2) skeletonV2.visible = share > 0;
    if (organs && !organsGrowWomb) { applyOpening(); if (abdomen) abdomen.visible = share > 0; if (thorax) thorax.visible = share > 0; }
    // (v2: and her own womb's wall shown through her, faintly, as it is while her baby is shown)
    if (vulva) vulva.seeWomb(share > 0 || (babyShown && !!babyHolder));
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || m.name === 'skeletonInV2' || m.name === 'sarahVagina') return;
      for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q === babyHolder || q.name === 'pelvicOrgans' || q.name === 'abdomenOrgans' || q.name === 'thoraxOrgans') return;
      const u = m.userData as { xraySolid?: THREE.Material | THREE.Material[]; xrayGhost?: THREE.Material[] };
      if (share > 0) {
        u.xraySolid ??= m.material;
        u.xrayGhost ??= (Array.isArray(u.xraySolid) ? u.xraySolid : [u.xraySolid]).map((b) => { const c = b.clone(); c.transparent = true; c.depthWrite = false; return c; });
        for (const g of u.xrayGhost) g.opacity = opacity;
        m.material = Array.isArray(u.xraySolid) ? u.xrayGhost : u.xrayGhost[0];
      } else if (u.xraySolid) {
        m.material = u.xraySolid; for (const g of u.xrayGhost ?? []) g.dispose(); delete u.xraySolid; delete u.xrayGhost;
      }
    });
  }
  /** v2 with her skeleton's opening, a birth: how open her canal and doors are held while her baby crosses them (the most
   * her opening has been since its head came to it), and the birth's clock when that was read (set back, it starts again). */
  let seatHeld = 0, seatClock = 0;
  /** v2 with her skeleton's opening: her opening is her doors at their seat, and her baby's way the one canal to them. */
  const seatOpening = (): boolean => !!organs && !organsGrowWomb && skeletonOpening && !!vulva?.skeletonOpening;
  /** v3: where her baby may give a little crossing her opening: her opening at its most (12.5 by 10 cm) -- its head as
   * well, all the way through her doors (Joshua, 2026-11-08, choosing it: head and shoulders "squeeze up to 22% while
   * inside the doors (like moulding)"; on v2 its head never gives). */
  function v3PassFrame(): ReturnType<NonNullable<typeof organs>['passFrame']> | null {
    const r = birthNow ? babyRoots()[birthNow.active] ?? babyRoots()[0] : undefined;
    if (!organs || !r) return null;
    r.updateMatrixWorld(true);
    return organs.passFrame(null, 0);
  }
  /** v3: the moment on the birth's clock its first baby is born (all of it out of her), at this pace and count. */
  let bornAtOf: { key: string; at: number } | null = null;
  function bornAt(): number {
    const key = `${birthPace}|${babyCount}`;
    if (bornAtOf?.key !== key) {
      let lo = 0, hi = birthLength(birthPace, babyCount);
      for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (birthAt(m, birthPace, birthEvents, babyCount, birthTurn()).babies.some((b) => b.born)) hi = m; else lo = m; }
      bornAtOf = { key, at: hi };
    }
    return bornAtOf.at;
  }
  /**
   * The birth stepped: its clock on, her cervix, her canal round her baby's head, her opening and the skin round it, as
   * it has them now (her baby itself is laid by `birthPlace`, as her babies are placed).
   */
  function stepBirth(dt: number): void {
    if (birthClock === null || (!vulva && !organs)) { birthNow = null; birthPath = null; organs?.setPassing(null); seatHeld = 0; return; }
    // (out of a birth pose it waits where it is)
    if (birthRunning && BIRTH_POSES_OK.includes(pose)) birthClock += dt;
    // (v3, on her skeleton: held as her baby is born -- Joshua, 2026-11-08: "Stop at the born since we don't have any skin
    // yet... we will come back to on her after we have skin for the model")
    if (!vulva) { const held = bornAt(); if (birthClock > held) { birthClock = held; birthRunning = false; } }
    birthNow = birthAt(birthClock, birthPace, birthEvents, babyCount, birthTurn());
    // her baby drawn through it even without SEE BABY: hidden inside her by her own body until it comes out of her (only
    // the baby: its sac, her womb's wall, its placenta and cord stay as SEE BABY has them)
    if (!babyRoot) loadBaby();
    else if (!babyHolder && babyFrame) { const was = babyShown; showBaby(true); if (!was) showBaby(false); }
    // (its placenta too, until it comes away for the afterbirth: from then it is drawn, as her baby is -- this runs on a
    // still frame as well, when the cords are not laid again, and once hid it there: a paused room had no placenta)
    if (babyHolder && !babyShown) { babyHolder.visible = true; for (const m of [babySac, babyWall, ...babyOwnSacs, ...placentaMeshes, ...cordMeshes]) if (m) m.visible = false; birthNow.placentas.forEach((p, k) => { if (placentaMeshes[k] && p.separate > 0) placentaMeshes[k].visible = true; }); }
    // (her opening and canal follow the baby whose turn it is)
    const r = babyRoots()[birthNow.active] ?? babyRoots()[0], scale = r?.scale.x ?? 0.33, R = headRadiusOf(scale);
    if (!vulva) {
      // v3, ON HER SKELETON (the skeleton-outward plan, Phase 1): her cervix and canal opened as her labour has them; her
      // baby's way down her own canal (organs: actor/birthCanal.ts); and her opening's doors pushed by her baby -- all of
      // it, head, shoulders, body and legs -- where it passes them (actor/birthDoors.ts `pressDoor`)
      organs!.setCervix(Math.max(birthOpenPct / 100, birthNow.cervix));
      birthPath = organs!.canalPath();
      if (birthPath) { birthLen ??= birthPath.length; birthPath.length = birthLen; }
      // (as it is drawn: given a little where it is wider than her opening stretches -- babySqueeze.ts)
      { const pts = birthNow.down > BIRTH_DOORS_FROM && r ? babyPassing(r) : null, pf = pts && babySoftOn ? v3PassFrame() : null;
        if (pts && pf) squeezePoints(pts, pf, M);
        organs!.setPassing(pts); }
    } else {
    // what of her baby is passing through her opening: her rim hugs its outline (the head, then its shoulders and body)
    // (her skeleton's opening in v2: her baby's way is that one canal -- down behind her pubic arch and forward under it to
    // her doors -- measured by its length fully open; v2's own canal otherwise)
    const seatWay = seatOpening() ? organs!.canalPath() : null;
    birthPath = seatWay ?? vulva.canalPath();
    if (seatWay && organs && organs.canalOpenLength > 0) birthLen = organs.canalOpenLength;
    // (and the way it travels there: her canal's own way out at her opening)
    { const pp = birthPath?.points, k = pp ? pp.length - 1 : -1, axis = pp && k >= 3 ? pp[k].clone().sub(pp[k - 3]) : undefined;
      // (its middle: the head's own while the head passes -- until its middle is `BIRTH_HEAD.pastMouth` of its radius out
      // of her; from there what crosses her opening is its neck and shoulders, hugged as its body is)
      const Lp = birthLen ?? birthPath?.length ?? 0.105, past = headDownOf(birthNow, Lp, scale) - Lp;
      const headW = r && birthHeadModel && past < BIRTH_HEAD.pastMouth * R ? headMiddle(r) : null;
      const crossing = birthNow.down > 0.7 && birthNow.down < 1.98 && r ? babyPassing(r) : null;
      vulva.setPassing(crossing ?? placentaPassing(), axis, birthNow.down < 1.98 ? headW : null, R);
      // (her skeleton's opening: her doors pushed by what of her baby crosses them, as on her skeleton -- its head, then
      // its neck, shoulders and body -- and her canal held down at its seat while it does. Her skin's opening followed its
      // neck in as its head came out, and so did her doors and all her canal with them, off her baby and back up to her
      // skin: Joshua, 2026-11-10, "the whole opening moves down and far from the skin")
      if (seatOpening()) {
        organs!.setPassing(crossing);
        const o = vulva.drawnOpen;
        if (birthClock < seatClock - 1e-6) seatHeld = 0;
        seatClock = birthClock;
        seatHeld = birthNow.down >= SEAT_HELD.from && birthNow.down < 2 ? Math.max(seatHeld, o) : Math.max(o, seatHeld - SEAT_HELD.release * dt);
      } }
    // (her canal's length as the birth began: laid again as her opening widens, its rings move a little, and a head placed
    // by the new length jumped)
    if (birthPath) { birthLen ??= birthPath.length; birthPath.length = birthLen; }
    // (triplets: the bassinet beside her for the third)
    placeBassinet(babyCount >= 3);
    const L = birthPath?.length ?? 0.105, d = headDownOf(birthNow, L, scale);
    // its head stretches her canal while it is in her
    vulva.setHead(birthNow.engage > 0.5 && d < L + R ? d : null, R);
    vulva.stepCanal(dt);
    // her opening: as wide as the head is where her opening is (a sphere's slice), its neck and shoulders after it, and
    // closing once all of it is out; the skin round it bulging as the head comes near and while it crowns
    const x = L - d;
    let across = Math.abs(x) < R ? 2 * Math.sqrt(R * R - x * x) : 0;
    if (x <= -R) across = 2 * R * 0.9;
    // (and as its feet leave her, down to part open, easing back from there once it is born)
    let open = across > 0 ? Math.min(1, (across + 0.006) / 0.1) : 0;
    if (x <= -R && birthNow.down >= 1.9) open += (BIRTH_AFTER_OPEN - open) * Math.min(1, (birthNow.down - 1.9) / 0.1);
    if (bornStage(birthNow)) open = BIRTH_AFTER_OPEN * (1 - birthNow.closing);
    // (and opened again round the placenta as it comes out of her, folded: as wide as it is)
    { const pd = birthNow.placentaDown, sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      open = Math.max(open, AFTERBIRTH.open * sm(0.85, 1.2, pd) * (1 - sm(1.75, 2, pd))); }
    const bulge = 0.6 * (d > L - 0.07 ? Math.min(1, (d - (L - 0.07)) / (0.07 - 0.5 * R)) : 0) * (d > L ? Math.max(0, 1 - (d - L) / R) : 1);
    vulva.setBirthDrive({ open, bulge: Math.max(0, bulge), cervix: birthNow.cervix });
    }
    // her belly settling smaller once her baby is born (a step at a time: her shape is laid again each step)
    // (with twins and triplets, by each one out: `delivered`)
    { const want = 1 - BIRTH_SHRINK * birthNow.delivered - AFTERBIRTH.shrink * birthNow.afterbirth;
      if (Math.abs(want - birthBellyShare) > 0.01 || (want === 1 && birthBellyShare !== 1)) {
        birthBellyShare = want;
        // (and the room her belly made for her baby taken off: it is out of her now)
        if (want < 1 && birthPushWas === null) { birthPushWas = babyPushOff; babyPushOff = true; if (babyPushField) layPush(babyPushField); }
        applyLook();
      } }
    birthLineAt += dt;
    if (birthLineAt > 0.25) { birthLineAt = 0; const f = fields[SARAH_LAB_FIELD.birthLine]; if (f) f.textContent = birthLine(birthNow, vulva ? vulva.drawnOpen * 10 : (organs?.doorOpenM ?? 0) * 100) + (!vulva && birthClock >= bornAt() ? ' · held at born (on her: once her skin is built)' : birthRunning ? '' : ' · paused');
      const len = birthLength(birthPace, babyCount), tl = fields[SARAH_LAB_FIELD.birthTime];
      if (tl) tl.textContent = `TIMELINE · ${Math.floor(birthClock / 60)}:${String(Math.floor(birthClock % 60)).padStart(2, '0')} of ${Math.floor(len / 60)}:${String(Math.round(len % 60)).padStart(2, '0')}`;
      if (birthTimeInput && document.activeElement !== birthTimeInput) birthTimeInput.value = String(Math.round((birthClock / len) * 1000)); }
  }
  /** Her baby laid where its birth has it (true), in her rest frame under the holder; false while no birth holds it. */
  const bpA = new THREE.Vector3(), bpB = new THREE.Vector3(), bpT = new THREE.Vector3(), bpQ = new THREE.Quaternion(), bpM = new THREE.Matrix4(), bpOwn = new THREE.Matrix4();
  /** her baby's body as points (world), a few hundred over it (its own skinned meshes, every so many vertices) */
  const passPick = new WeakMap<THREE.SkinnedMesh, Uint32Array>();
  function babyPassing(root: THREE.Object3D): Float32Array | null {
    const pts: number[] = [], v = new THREE.Vector3();
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      const m = o as THREE.SkinnedMesh; if (!m.isSkinnedMesh || !m.visible) return;
      let pick = passPick.get(m);
      if (!pick) { const n = m.geometry.getAttribute('position').count, step = Math.max(1, Math.floor(n / 4000)), a: number[] = []; for (let i = 0; i < n; i += step) a.push(i); pick = Uint32Array.from(a); passPick.set(m, pick); }
      m.skeleton.update();
      for (const i of pick) { m.getVertexPosition(i, v); m.localToWorld(v); pts.push(v.x, v.y, v.z); }
    });
    return pts.length ? Float32Array.from(pts) : null;
  }
  /** Whether her baby's body is laid along her canal's turn (`birthAlong`): down the one canal that comes behind her pubic
   * arch and forward under it -- her skeleton's, on her skeleton and in v2 with her skeleton's opening. Down v2's own
   * canal, which is short and nearly straight, it is one stiff length as it always was (v2 is the baseline). */
  const alongCanal = (): boolean => babyAlongOn && (!vulva || seatOpening());
  /** How far its root was moved to keep its head where its birth has it, its body laid along her canal (`birthAlong`): world. */
  const birthAlongOff = new WeakMap<THREE.Object3D, THREE.Vector3>();
  /** The middle of its head, in the world (null before its body is read). */
  function headMiddle(r: THREE.Object3D): THREE.Vector3 | null {
    if (!birthHeadModel) return null;
    const h = birthHeadModel.clone().applyMatrix4(r.matrixWorld), off = birthAlongOff.get(r);
    return off ? h.sub(off) : h;
  }
  /**
   * ITS BODY ROUND THE BEND OF HER CANAL (Joshua, 2026-11-10: "how could the baby make that tight of a turn"). Her canal
   * comes down behind her pubic arch and turns forward under it; placed as one stiff length behind its head, its body cut
   * that corner and its legs came out through her skin behind her opening. What of it is in her is laid along her canal
   * where it is (baby.ts `poseAlong`): above the top of her canal, on up the way her canal comes from; out of her, as its
   * birth has it (straight on out, tilted, swung, lifted) -- eased from one to the other over `BIRTH_ALONG` at her opening.
   * `k`: how far it is made long (none of this while it is curled in her womb).
   */
  function birthAlong(r: THREE.Object3D, i: number, m: BirthMoment, bones: ReadonlyMap<string, THREE.Bone>, k: number): void {
    birthAlongOff.delete(r);
    const c = alongCanal() && k > 0 && babyHolder && babyCurl && birthHeadModel ? canalHere() : null, neck = bones.get(BABY_BONES.neck);
    if (!c || !neck || !babyHolder || !babyCurl || !birthHeadModel) return;
    r.updateMatrixWorld(true);
    const perMetre = babyHolder.getWorldScale(new THREE.Vector3()).x, end = c.length, line = birthOutLines[i] ?? null;
    // (where its head's middle is down her canal, and how far behind that its neck's joint is, along its length)
    const long = babyCurl.long.clone().applyQuaternion(r.getWorldQuaternion(new THREE.Quaternion())).normalize();
    const behind = Math.max(0, birthHeadModel.clone().applyMatrix4(r.matrixWorld).sub(neck.getWorldPosition(new THREE.Vector3())).dot(long)) / perMetre;
    const d = Math.max(0, headDownOf(m, end, r.scale.x)) - behind, way = new THREE.Vector3();
    const moved = poseAlong(bones, {
      perMetre, settle: BIRTH_ALONG.settle,
      at: (s, out) => {
        const dd = d - s;
        if (dd > end && line) out.copy(line.at).addScaledVector(line.way, dd - end); else canalAt(c, dd, out, way);
        return babyHolder!.localToWorld(out);
      },
      share: (s) => { const t = Math.min(1, Math.max(0, (d - s - (end - BIRTH_ALONG.inside)) / (BIRTH_ALONG.inside + BIRTH_ALONG.outside))); return k * (1 - t * t * (3 - 2 * t)); },
    });
    if (!moved || !r.parent) return;
    r.position.copy(r.parent.worldToLocal(r.getWorldPosition(new THREE.Vector3()).add(moved)));
    r.updateMatrixWorld(true);
    birthAlongOff.set(r, moved);
  }
  function birthPlace(r: THREE.Object3D, i = 0): boolean {
    const m = momentOf(i);
    if (!m || !birthPath || !babyHolder || !babyCurl || !birthHeadModel || birthPath.points.length < 2) return false;
    const scale = r.scale.x, L = birthPath.length, d = Math.max(0, headDownOf(m, L, scale));
    babyHolder.updateMatrixWorld(true);
    // (each point's distance down, measured on her canal as it is now and stretched to the length the birth began with)
    const pts = birthPath.points.map((p) => babyHolder!.worldToLocal(p.clone())), n = pts.length, k0 = L / Math.max(1e-6, birthPath.down[n - 1]), down = birthPath.down.map((x) => x * k0);
    // the point d down her canal, and the way on (past her opening, straight on out the way it leaves her)
    const at = (dd: number, out: THREE.Vector3) => {
      // (above the top of her cervix, on up the way her canal comes from)
      if (dd < 0) return out.copy(pts[0]).sub(pts[1]).normalize().multiplyScalar(-dd).add(pts[0]);
      let k = 0; while (k < n - 2 && down[k + 1] < dd) k++;
      const f = Math.min(1, Math.max(0, (dd - down[k]) / Math.max(1e-6, down[k + 1] - down[k])));
      return out.copy(pts[k]).lerp(pts[k + 1], f);
    };
    // (the way along, over a span either side: its rings at the mouth are too close together to say it alone; past her
    // opening, the way the last 2.5 cm of her canal points)
    const end = down[n - 1], span = BIRTH_HEAD.tangentSpan;
    // (out of her, along the way her canal pointed as its head came out, held from then: her opening is drawn round it
    // as it passes and her canal's mouth with it, and a way read from that each frame swung it, and that her opening)
    if (d <= end) { at(d, bpA); birthOutLines[i] = null; }
    else {
      // (kept with her PELVIS, which her opening is in: her holder rides her lower spine, and bent over to catch it a line
      // kept there carried a baby half out of her up with her back)
      const pb = measure ? bodyOf()?.mesh.skeleton.bones[measure.joints.pelvis] : undefined;
      if (pb) pb.updateWorldMatrix(true, false);
      if (!birthOutLines[i]) {
        at(end - 2 * span, bpB); at(end, bpA);
        const line: NonNullable<(typeof birthOutLines)[number]> = { at: bpA.clone(), way: bpA.clone().sub(bpB).normalize() };
        if (pb) { line.pAt = pb.worldToLocal(babyHolder.localToWorld(line.at.clone())); line.pWay = line.way.clone().transformDirection(babyHolder.matrixWorld).transformDirection(pb.matrixWorld.clone().invert()); }
        birthOutLines[i] = line;
      } else {
        const line = birthOutLines[i]!;
        if (pb && line.pAt && line.pWay) { line.at.copy(babyHolder.worldToLocal(pb.localToWorld(line.pAt.clone()))); line.way.copy(line.pWay).transformDirection(pb.matrixWorld).transformDirection(babyHolder.matrixWorld.clone().invert()); }
      }
      const line = birthOutLines[i]!;
      bpA.copy(line.at).addScaledVector(line.way, d - end);
    }
    // its length along the line from its body, up her canal behind its head, to its head: its body follows the curve
    // rather than going straight back through her (2026-11-02: its toes came out under her opening as it crowned)
    // (laid along her canal's turn, `birthAlong`: its HEAD's own way on -- from where its neck is to its middle -- its
    // back and legs each their own behind it; over the 10 cm of one stiff length its head pointed where its body had
    // been, and its neck's joint lay 4.7 cm off the middle of her canal as it crowned, 2026-11-10)
    at(d - (alongCanal() ? BIRTH_ALONG.headSpan : BIRTH_HEAD.bodyBehind), bpB); bpT.copy(bpA).sub(bpB).normalize();
    // its head first, along the way on; the back of its head turned from her front toward her left by `turnDeg`
    const long = bpT, front = bpB.set(0, 0, 1).addScaledVector(long, -long.z).normalize(), left = new THREE.Vector3(1, 0, 0).addScaledVector(long, -long.x).normalize();
    const th = (m.turnDeg * Math.PI) / 180, back = front.clone().multiplyScalar(Math.cos(th)).addScaledVector(left, Math.sin(th)).normalize();
    const side = new THREE.Vector3().crossVectors(long, back).normalize(); back.crossVectors(side, long).normalize();
    bpM.makeBasis(side, long, back); bpOwn.makeBasis(babyCurl.side, babyCurl.long, babyCurl.back).transpose();
    bpQ.setFromRotationMatrix(bpM.multiply(bpOwn));
    // ITS TRUNK DOWN HER CANAL, NOT ITS CURL (2026-11-03, Joshua: "the shoulders are wider than the opening"): the
    // line above is its curl's long axis, its middle as it lay curled; made long coming down, its trunk lies at a slant
    // to that, and its shoulders and hips came out of her three to six centimetres off her opening's middle -- through
    // the skin beside it. Its trunk as posed (hips to neck) turned onto the way on, about its head, as it is made long.
    const pos = bpA.clone().sub(birthHeadModel.clone().multiplyScalar(scale).applyQuaternion(bpQ));
    // ITS BODY THROUGH THE MIDDLE OF HER OPENING (2026-11-03, Joshua: "the shoulders are wider than the opening"): its
    // head rides her canal's line, and its trunk lies beside that line, its neck bent -- so its shoulders and hips came
    // out of her two to six centimetres to one side of her opening, through the skin beside it. Once its head is out,
    // it is moved across (not turned: its pose is the same) until where its trunk crosses her opening is its middle.
    const birthCentreOff = centreOffOf(i), birthOutLine = birthOutLines[i] ?? null;
    if (!(m.down > 1 && m.onHer < 1)) birthCentreOff.set(0, 0, 0);
    // (squatting, held once her hands swing it up -- read from where it was drawn last frame, swung, its middle chased
    // its own swing and threw it up past her knee)
    const swinging = pose === 'squat' && m.down > SQUAT_CATCH.swingFrom;
    if (swinging) pos.sub(birthCentreOff);
    if (m.down > 1 && m.onHer < 1 && !swinging) {
      const hl = r.getObjectByName(BABY_BONES.leg.left[0]), hr = r.getObjectByName(BABY_BONES.leg.right[0]), nk = r.getObjectByName(BABY_BONES.neck);
      if (hl && hr && nk) {
        r.updateMatrixWorld(true);
        const inHolder = (b: THREE.Object3D) => r.worldToLocal(b.getWorldPosition(new THREE.Vector3())).multiplyScalar(scale).applyQuaternion(bpQ).add(pos);
        const hip = inHolder(hl).add(inHolder(hr)).multiplyScalar(0.5), neck = inHolder(nk);
        const E = birthOutLine ? birthOutLine.at.clone() : at(end, new THREE.Vector3()), tE = birthOutLine ? birthOutLine.way.clone() : at(end, new THREE.Vector3()).sub(at(end - 2 * span, new THREE.Vector3())).normalize(), dir = neck.clone().sub(hip);
        const den = dir.dot(tE);
        if (Math.abs(den) > 1e-9) {
          const t = Math.min(1.2, Math.max(0, E.clone().sub(hip).dot(tE) / den)), X = hip.addScaledVector(dir, t), off = X.sub(E); off.addScaledVector(tE, -off.dot(tE));
          const w = Math.min(1, Math.max(0, (m.down - 1) / 0.2));
          // (eased toward, not taken at once: her opening is drawn toward its middle as it is drawn toward hers, and
          // each taking the other's place at once, they chased each other, a few centimetres a frame)
          const k = 1 - Math.exp(-Math.max(0, babyStepDt) / BIRTH_HEAD.centreEase);
          birthCentreOff.addScaledVector(off.multiplyScalar(w * w * (3 - 2 * w)).sub(birthCentreOff), k);
          pos.sub(birthCentreOff);
        }
      }
    }
    // ITS SHOULDERS OUT, TOP THEN BOTTOM (v3's accurate turn, birthSequence.ts SHOULDER_TILT): its body dipped toward her
    // tailbone as its top shoulder comes out under her pubic bone, then lifted toward her front for its bottom one -- turned
    // about where it crosses her opening, across her
    if (m.shoulderTiltDeg) {
      const E = birthOutLine ? birthOutLine.at.clone() : at(end, new THREE.Vector3()), way = birthOutLine ? birthOutLine.way.clone() : at(end, new THREE.Vector3()).sub(at(end - 2 * span, new THREE.Vector3())).normalize();
      const axis = new THREE.Vector3().crossVectors(way, new THREE.Vector3(0, 0, 1));
      if (axis.lengthSq() > 1e-10) {
        const qt = new THREE.Quaternion().setFromAxisAngle(axis.normalize(), (m.shoulderTiltDeg * Math.PI) / 180);
        pos.sub(E).applyQuaternion(qt).add(E); bpQ.premultiply(qt);
      }
    }
    // from where it lies in her womb onto her cervix as its head settles -- a twin or triplet turned head down first, where
    // it lies (P3: Joshua chose that over a bottom-first birth), then settled
    if (i === 0) { if (m.engage < 1) { pos.lerpVectors(r.position, pos, m.engage); bpQ.slerpQuaternions(r.quaternion, bpQ.clone(), m.engage); } }
    else if (m.engage < 1) {
      // (turned about its own middle -- its curl's -- where it lies: about its root, which is not in it, it swung out of her)
      const turnK = birthNow?.babies[i]?.lieTurn ?? 1, c0 = babyCurl.centre.clone().multiplyScalar(scale);
      const midNow = c0.clone().applyQuaternion(r.quaternion).add(r.position), qT = r.quaternion.clone().slerp(bpQ, turnK);
      const posT = midNow.sub(c0.applyQuaternion(qT));
      pos.lerpVectors(posT, pos, m.engage); bpQ.slerpQuaternions(qT, bpQ.clone(), m.engage);
    }
    // CAUGHT (P3b, SQUAT): squatting, its way out of her points down at the mat; as its body comes out her hands swing it
    // up and forward, about her opening, until it lies along them in front of her -- not hanging to the mat below
    // (a twin born after she has sat back: its way out points down into the mat, and it is laid along the mat instead,
    // ahead of her, until it is lifted onto her)
    if (pose === 'squat' && m.down > SQUAT_CATCH.swingFrom && birthOutLines[i]) {
      const k0 = Math.min(1, Math.max(0, (m.down - SQUAT_CATCH.swingFrom) / (2 - SQUAT_CATCH.swingFrom))), k = k0 * k0 * (3 - 2 * k0);
      const pivot = birthOutLines[i]!.at, way = birthOutLines[i]!.way;
      // (ahead of her, level in the world, in her frame)
      const inv = babyHolder.matrixWorld.clone().invert(), ahead = new THREE.Vector3(0, 0, 1).transformDirection(babyHolder.matrixWorld); ahead.y = 0;
      if (ahead.lengthSq() < 1e-10) ahead.set(0, 0, 1);
      ahead.normalize().transformDirection(inv);
      const axis = new THREE.Vector3().crossVectors(way, ahead), most = Math.acos(Math.min(1, Math.max(-1, way.dot(ahead))));
      if (axis.lengthSq() > 1e-10) {
        const angle = i === 0 ? Math.min(most, SQUAT_CATCH.swing * Math.PI / 180) : most;
        const qr = new THREE.Quaternion().setFromAxisAngle(axis.normalize(), angle * k);
        pos.sub(pivot).applyQuaternion(qr).add(pivot); bpQ.premultiply(qr);
        // (the one she catches squatting: raised a little in her hands as she swings it up)
        if (i === 0) pos.addScaledVector(new THREE.Vector3(0, 1, 0).transformDirection(inv), SQUAT_CATCH.lift * k);
      }
    }
    // born: lifted up and onto her, face down on her chest and belly, its head toward hers (skin to skin), in an arc
    if (m.onHer > 0) {
      const rest = birthRestPlace(scale, i);
      if (rest) {
        const u = m.onHer;
        // (and riding her belly as it moves: its soft body's swing)
        if (pose === 'squat' && !inBassinet(i)) {
          // SQUATTING, LIFTED IN HER HANDS (P3b): its MIDDLE carried straight up to her chest as it turns -- moved by its
          // root, which is by its feet, it swung out round that as it turned and stayed out at her knee, past her reach --
          // brought in toward her first (the one she caught: its way quickest at its start), a little up and out between
          const c0 = babyCurl.centre.clone().multiplyScalar(scale), ue = i === 0 ? 1 - (1 - u) * (1 - u) : u;
          const from = pos.clone().add(c0.clone().applyQuaternion(bpQ)), to = rest.position.clone().add(c0.clone().applyQuaternion(rest.quaternion));
          bpQ.slerp(rest.quaternion, u);
          pos.copy(from.lerp(to, ue)).sub(c0.applyQuaternion(bpQ)).add(bpB.set(0, SQUAT_CATCH.arc[0], SQUAT_CATCH.arc[1]).multiplyScalar(Math.sin(u * Math.PI))).addScaledVector(jiggle.belly.value, u);
        } else {
          pos.lerp(rest.position, u);
          // (in an arc: onto her, up and toward her; into the bassinet, up over her thigh -- straight up in the world)
          if (inBassinet(i)) pos.addScaledVector(bpB.set(0, 1, 0).transformDirection(babyHolder.matrixWorld.clone().invert()), BASSINET.arc * Math.sin(u * Math.PI));
          else pos.add(bpB.set(0, 0.04, 0.12).multiplyScalar(Math.sin(u * Math.PI))).addScaledVector(jiggle.belly.value, u);
          bpQ.slerp(rest.quaternion, u);
        }
      }
      // into her arms (P2, position B): turned onto its back across her, lifted a little off her on the way
      const c = cradleShare * cradleShare * (3 - 2 * cradleShare), cr = c > 0 && !inBassinet(i) && (babyCount === 1 || i < 2) ? cradlePlace(scale, i) : null;
      if (cr) { pos.lerp(cr.position, c).add(bpB.set(0, 0, BABY_CRADLE.arc).multiplyScalar(Math.sin(c * Math.PI))); bpQ.slerp(cr.quaternion, c); }
    }
    r.position.copy(pos); r.quaternion.copy(bpQ);
    return true;
  }
  /** Where her baby lies on her once born (her rest frame): face down on her, centred on the front of her belly a little
   * below her breasts, its head toward hers; worked out once a birth, from her skin as drawn. */
  let birthRest: { position: THREE.Vector3; quaternion: THREE.Quaternion } | null = null, birthRestAt: THREE.Vector3 | null = null, birthRestKey = '', birthPushWas: boolean | null = null;
  /** twins and triplets (P3): each one's own place, as `birthRest` is the first's */
  const birthRests: ({ position: THREE.Vector3; quaternion: THREE.Quaternion; key: string } | null)[] = [];
  /** A triplet's third goes into the bassinet beside her (P3, Joshua 2026-11-04): three on her chest is too many. */
  const inBassinet = (i: number): boolean => babyCount >= 3 && i === 2;
  function birthRestPlace(scale: number, i = 0): { position: THREE.Vector3; quaternion: THREE.Quaternion } | null {
    if (inBassinet(i)) return bassinetPlace(scale);
    const sv = jiggle.bellySoft.value, key = `${shownBump().toFixed(1)}|${pose}|${sv.x.toFixed(2)}|${sv.y.toFixed(2)}|${sv.z.toFixed(2)}|${babyCount}|${scale.toFixed(3)}`;
    // (twins: side by side on her chest, the first to her left, the second to her right)
    const x0 = babyCount >= 2 ? (i === 0 ? TWINS_ON_HER.across : -TWINS_ON_HER.across) : 0;
    if (i > 0) { const own = birthRests[i]; if (own && own.key === key) return own; }
    else if (birthRest && birthRestKey === key) return birthRest;
    if (i === 0) birthRestKey = key;
    const skin = bellySkin();
    if (!skin || !babyCurl) return null;
    // (as her belly's soft shape has it: the shaders move her skin so, and the baby lies on what is drawn)
    { const b = bodyOf(), jw = b ? jiggleOfMesh(b.mesh)?.weights : null, at = babySkinAt, p = new THREE.Vector3(), m = new THREE.Vector3();
      if (jw && at) for (let k = 0; k < at.length; k++) { softAt(jiggle, jw[at[k] * 3], p.fromArray(skin, k * 3), m); skin[k * 3] += m.x; skin[k * 3 + 1] += m.y; skin[k * 3 + 2] += m.z; } }
    // HER FRONT DOWN HER MIDDLE (2026-11-02, Joshua: its legs "aren't resting fully on her and floating"): her skin's
    // furthest forward at each height, so it lies along her as she is curved there, not at a set lean
    const R = BIRTH_REST, step = 0.01, lo = 0.78, n = Math.round((R.top - lo) / step) + 1, front = new Float32Array(n).fill(-Infinity);
    for (let v = 0; v < skin.length; v += 3) {
      if (Math.abs(skin[v] - x0) > R.across) continue;
      const k = Math.round((skin[v + 1] - lo) / step);
      if (k >= 0 && k < n && skin[v + 2] > front[k]) front[k] = skin[v + 2];
    }
    const zAt = (y: number): number => { let k = Math.max(0, Math.min(n - 1, Math.round((y - lo) / step))); for (let d = 0; d < n && !Number.isFinite(front[k]); d++) k = Math.max(0, Math.min(n - 1, k + (d % 2 ? d : -d))); return front[k]; };
    const yTop = R.top, yBot = R.top - R.span;
    if (!Number.isFinite(zAt(yTop)) || !Number.isFinite(zAt(yBot))) return null;
    const top = new THREE.Vector3(x0, yTop, zAt(yTop)), bot = new THREE.Vector3(x0, yBot, zAt(yBot));
    const restAt = top.clone().add(bot).multiplyScalar(0.5);
    if (i === 0) birthRestAt = restAt;
    // its length along the line from where its bottom rests to where its head does; its back out from her
    const long = top.clone().sub(bot).normalize(), back = new THREE.Vector3(0, -long.z, long.y).normalize();
    // (her belly rounds up between the two: it lies over that, its middle eased up most of the way over it)
    let bulge = 0;
    for (let y = yBot; y <= yTop; y += step) bulge = Math.max(bulge, new THREE.Vector3(x0, y, zAt(y)).sub(bot).dot(back));
    const side = new THREE.Vector3().crossVectors(long, back).normalize();
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, long, back).multiply(new THREE.Matrix4().makeBasis(babyCurl.side, babyCurl.long, babyCurl.back).transpose()));
    const centre = restAt.clone().addScaledVector(back, R.depth * babyCurl.size.z * scale + R.over * bulge + R.gap);
    // (its head end at the top: its curl's middle on the middle of the line)
    const position = centre.sub(babyCurl.centre.clone().multiplyScalar(scale).applyQuaternion(q));
    if (i > 0) { birthRests[i] = { position, quaternion: q, key }; return birthRests[i]; }
    birthRest = { position, quaternion: q };
    return birthRest;
  }
  /**
   * POSITION B, CRADLED (P2): where her baby lies in her arms (her rest frame, as birthRestPlace) -- on its back across
   * her a little below her breasts, its head to her left -- and where her arms hold it: her left elbow's crook under its
   * head, her left palm under its bottom, her right palm on its tummy (each a point and the way the palm faces, rest
   * frame; babyHandTarget takes them to the world). Worked out from her skin as drawn, again when that changes.
   */
  interface Cradle { position: THREE.Vector3; quaternion: THREE.Quaternion; head: THREE.Vector3; bottom: THREE.Vector3; middle: THREE.Vector3; long: THREE.Vector3; back: THREE.Vector3; front: number; under: number }
  let cradle: Cradle | null = null, cradleKey = '';
  /** twins in her arms (P3): each one's own place, as `cradle` is one baby's (the first's, with twins) */
  const cradles: (Cradle | null)[] = [], cradleKeys: string[] = [];
  const cradleOf = (i: number): Cradle | null => (babyCount >= 2 ? cradles[i] ?? null : i === 0 ? cradle : null);
  function cradlePlace(scale: number, i = 0): Cradle | null {
    const twins = babyCount >= 2, key = `${shownBump().toFixed(1)}|${pose}|${scale.toFixed(3)}|${babyCount}`;
    if (twins) { if (cradles[i] && cradleKeys[i] === key) return cradles[i]; }
    else if (cradle && cradleKey === key) return cradle;
    const skin = bellySkin();
    if (!skin || !babyCurl) return null;
    if (twins) cradleKeys[i] = key; else cradleKey = key;
    // (twins: each in one arm, the first in her left, its head toward her left)
    const way = twins && i === 1 ? -1 : 1, T = TWINS_CRADLE;
    const C = twins ? { ...BABY_CRADLE, left: way * T.across, rise: T.rise, y: T.y, out: T.out } : BABY_CRADLE;
    // her front at that height: the furthest forward of her skin within a few centimetres of it, near her middle
    let front = -Infinity, under = -Infinity;
    for (let i = 0; i < skin.length; i += 3) {
      if (Math.abs(skin[i + 1] - C.y) < 0.02 && Math.abs(skin[i] - C.left) < 0.08) front = Math.max(front, skin[i + 2]);
      // (and where her forearm passes under it, `armBelow` lower and across most of her: her belly there, which stands
      // further out than her skin under her breasts -- her arm went into it, Joshua 2026-11-04)
      if (Math.abs(skin[i + 1] - (C.y - C.armBelow)) < 0.025 && Math.abs(skin[i] - C.left) < 0.14) under = Math.max(under, skin[i + 2]);
    }
    if (!Number.isFinite(front)) return null;
    const middle = new THREE.Vector3(C.left, C.y, Math.max(front + C.out, under + C.armClear) - (twins && i === 1 ? T.behind : 0));
    // its length across her toward her left (+x in her rest frame), tipped up toward its head; its back toward her and
    // turned down onto her forearm (the second twin: toward her right, in her right arm)
    const long = new THREE.Vector3(way, C.rise, 0).normalize(), back = new THREE.Vector3(0, -Math.sin(C.lie), -Math.cos(C.lie));
    back.addScaledVector(long, -back.dot(long)).normalize();
    const side = new THREE.Vector3().crossVectors(long, back).normalize();
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, long, back).multiply(new THREE.Matrix4().makeBasis(babyCurl.side, babyCurl.long, babyCurl.back).transpose()));
    const position = middle.clone().sub(babyCurl.centre.clone().multiplyScalar(scale).applyQuaternion(q));
    // its head and its bottom: its curl's length either side of its middle, a little short of each end
    const half = 0.5 * babyCurl.size.y * scale * 0.8;
    const placed = { position, quaternion: q, head: middle.clone().addScaledVector(long, half), bottom: middle.clone().addScaledVector(long, -half), middle, long, back, front, under };
    if (twins) { cradles[i] = placed; if (i === 0) cradle = placed; return placed; }
    cradle = placed;
    return cradle;
  }
  /** BIRTH: begun (from the start) or paused and on again; reset takes it back to before it began. */
  function birthControl(cmd: 'run' | 'reset' | 'pace'): void {
    if (cmd === 'reset') { birthRest = null; birthOutLines.length = 0; birthRests.length = 0; birthCentreOffs.length = 0; placeBassinet(false); twinHandShare = 0; for (const c of cordOuts) if (c) { c.cut = false; c.outerLaid = false; c.stumpLaid = false; c.remnantLaid = false; for (const t of [c.outerMesh, c.stumpMesh, c.remnantMesh]) if (t) t.visible = false; } cordCut = false; birthEvents.cutAt = null; birthEvents.cuts = []; birthEvents.placentaAt = null; cordOuterLaid = false; cordStumpLaid = false; cordRemnantLaid = false; for (const t of [cordOuterMesh, cordStumpMesh, cordRemnantMesh]) if (t) t.visible = false; placeBowl(false); for (const m of placentaMeshes) { m.matrixAutoUpdate = true; m.position.set(0, 0, 0); m.quaternion.identity(); m.scale.setScalar(1); } if (birthPushWas !== null) { babyPushOff = birthPushWas; birthPushWas = null; babyDirty = true; } birthBellyShare = 1; if (birthTimeInput) birthTimeInput.value = '0'; if (babyHolder && !babyShown) { babyHolder.visible = false; for (const m of [...placentaMeshes, ...cordMeshes]) m.visible = true; if (babySac) babySac.visible = babyCount === 1; } birthLen = null; birthClock = null; birthRunning = false; birthNow = null; birthPath = null; vulva?.setBirthDrive(null); vulva?.setHead(null, 0); organs?.setPassing(null); organs?.setCervix(birthOpenPct / 100); applyLook(); const f = fields[SARAH_LAB_FIELD.birthLine]; if (f) f.textContent = birthLine(null); return; }
    if (cmd === 'pace') { const was = birthPace; birthPace = was === 'fast' ? 'realistic' : 'fast'; if (birthClock !== null) birthClock *= was === 'fast' ? 5 : 1 / 5; return; }
    // (a birth from RECLINE or SQUAT only -- Joshua, 2026-11-02: LEGS APART is her pre-labour stance)
    if (birthClock === null && !pregnant()) { const f = fields[SARAH_LAB_FIELD.birthLine]; if (f) f.textContent = 'BIRTH · not pregnant (PREGNANT · ON)'; return; }
    if (birthClock === null) { if (!BIRTH_POSES_OK.includes(pose)) { const f = fields[SARAH_LAB_FIELD.birthLine]; if (f) f.textContent = 'BIRTH · from RECLINE or SQUAT'; return; } birthClock = 0; birthRunning = true; applyLook(); return; }
    birthRunning = !birthRunning;
  }
  /** Each baby's placenta on her womb's lining, and its cord to its navel, stepped and drawn (SEE BABY). */
  function layCords(): void {
    const roots = babyRoots();
    if (!babyHolder || !babyWomb || !babySolidOf || !babyCurl) return;
    while (placentaMeshes.length < babyPlacentas.length) { const m = new THREE.Mesh(placentaGeometry(), placentaMat); m.frustumCulled = false; m.renderOrder = 3; babyHolder.add(m); placentaMeshes.push(m); }
    while (placentaMeshes.length > babyPlacentas.length) { const m = placentaMeshes.pop()!; m.removeFromParent(); m.geometry.dispose(); }
    while (cordMeshes.length < babyCords.length) { const m = new THREE.Mesh(cordTube(), cordMat); m.frustumCulled = false; m.renderOrder = 3; babyHolder.add(m); cordMeshes.push(m); }
    while (cordMeshes.length > babyCords.length) { const m = cordMeshes.pop()!; m.removeFromParent(); m.geometry.dispose(); }
    const bodies: CordBody[] = roots.map((r) => ({ solid: babySolidOf!, position: r.position, quaternion: r.quaternion, scale: r.scale.x, curlCentre: babyCurl!.centre }));
    babyHolder.updateMatrixWorld(true); holderInv.copy(babyHolder.matrixWorld).invert();
    // her canal as drawn now, in her frame (the placenta comes down it; the cord runs out of her by it)
    const canal = canalHere();
    babyPlacentas.forEach((pl, i) => { useCordOf(i); try {
      const m = placentaMeshes[i], r = roots[i], cord = babyCords[i], bm = momentOf(i);
      // laid on her lining once a fit (where it is does not change between), carried by her belly's swing -- or, in the
      // afterbirth, moved as a whole down her canal and into the bowl (birthSequence.ts AFTERBIRTH)
      if (m.userData.laid !== pl) { layPlacenta(m.geometry, pl, babyWomb!); m.userData.laid = pl; m.userData.open = 0; m.userData.curved = null; }
      const moved = !!bm && !!canal && afterbirthMatrix(pl, bm, canal, abMatrix, m.geometry);
      // (and opening out from the shell it grew as, into a lens, as it goes into the bowl: openPlacenta)
      openPlacenta(m, pl, moved && bm ? Math.min(1, Math.max(0, bm.bowl)) : 0);
      if (moved) { m.matrixAutoUpdate = false; m.matrix.copy(abMatrix); m.matrixWorldNeedsUpdate = true; }
      else { m.matrixAutoUpdate = true; m.position.copy(jiggle.belly.value); m.quaternion.identity(); m.scale.setScalar(1); }
      // (on its way it is drawn with or without SEE BABY, as her baby was: inside her, her own body hides it; through her
      // opening and out of her, it is seen)
      if (moved && !babyShown) m.visible = true;
      if (!r || !cord) return;
      // its navel where its body has it now (in her frame), the way out of it, and the cord's end in it (in its knot,
      // under its skin: BABY_NAVEL); and where the cord leaves the placenta (as the placenta is now)
      if (!navelNow(r, navelAt, navelWay)) return;
      babyHolder!.worldToLocal(navelAt); navelWay.transformDirection(holderInv);
      navelAt.addScaledVector(navelWay, -0.6 * BABY_NAVEL.stands * r.scale.x);
      cordA.copy(pl.at).addScaledVector(pl.normal, pl.thick - 0.003);
      if (moved) { cordA.applyMatrix4(abMatrix); placentaFace.copy(pl.normal).transformDirection(abMatrix); } else { cordA.add(jiggle.belly.value); placentaFace.copy(pl.normal); }
      // (out of her: from her opening -- in her frame -- once its navel is past it)
      const out = !!bm && bm.down >= 1 + BABY_NAVEL.fromCrown && !!birthPath && birthPath.points.length > 1;
      cordCut = out && !!bm?.cut;
      if (!out) cordOuterLaid = false;
      // (not cut -- or dragged back before the cut -- its stump and the cut cord out of her are laid afresh when it is)
      if (!cordCut) { cordStumpLaid = false; cordRemnantLaid = false; }
      if (out) babyHolder!.worldToLocal(cordOpen.copy(birthPath!.points[birthPath!.points.length - 1]));
      // inside her: placenta to navel; once its navel is out, placenta to her opening -- and once cut, only as long as the
      // way from the placenta to her opening (the rest of it hangs out of her), gone once the placenta is out of her
      const innerTo = out ? cordOpen : navelAt, innerWay = out ? undefined : navelWay;
      if (cordCut) cord.length = Math.max(4 * cord.radius, AFTERBIRTH.innerSlack * cordA.distanceTo(cordOpen));
      else cord.length = cordLength(weekForBump(onChart(), babyCount));
      // (kept in her womb, but not once the placenta has left it down her canal)
      const innerIn = !(cordCut && (bm?.placentaDown ?? 0) > 0);
      if (!cordLaid[i]) { cord.lay(cordA, innerTo, babyWomb!.centre.clone().add(jiggle.belly.value)); cordLaid[i] = true; for (let k = 0; k < 30; k++) cord.step(1 / 60, cordA, innerTo, babyWomb!, jiggle.belly.value, bodies, i, { bWay: innerWay, inWomb: innerIn }); }
      cord.step(babyStepDt, cordA, innerTo, babyWomb!, jiggle.belly.value, bodies, i, { bWay: innerWay, inWomb: innerIn });
      layCordTube(cordMeshes[i].geometry, cord.points, cord.radius);
      layCordOut(out, cord.radius, bodies, canal, i, bm?.placentaDown ?? 0);
    } finally { keepCordOf(i); } });
    // (the bowl, once any cord is cut; and the first baby's cord loaded again, as one baby's always was)
    placeBowl(cordOuts.some((c) => c?.cut));
    useCordOf(0);
  }
  /** Her canal as drawn now, in her frame (the holder's): its middle line from the top of her cervix to her opening, each
   * point's distance down it (stretched to the length the birth began with, as the baby's own path is), and its length. */
  interface CanalHere { readonly pts: THREE.Vector3[]; readonly down: number[]; readonly length: number }
  function canalHere(): CanalHere | null {
    if (!birthPath || birthPath.points.length < 3 || !babyHolder) return null;
    const pts = birthPath.points.map((q) => babyHolder!.worldToLocal(q.clone())), n = pts.length, L = birthPath.length;
    const k0 = L / Math.max(1e-6, birthPath.down[n - 1]);
    return { pts, down: birthPath.down.map((x) => x * k0), length: L };
  }
  /** The point `dd` down her canal (above its top: on up the way it comes from; past her opening: on out the way it
   * leaves her) and the way on there (unit). */
  function canalAt(c: CanalHere, dd: number, at: THREE.Vector3, way: THREE.Vector3): void {
    const { pts, down } = c, n = pts.length;
    if (dd <= 0) { way.copy(pts[1]).sub(pts[0]).normalize(); at.copy(pts[0]).addScaledVector(way, dd); return; }
    if (dd >= down[n - 1]) { way.copy(pts[n - 1]).sub(pts[Math.max(0, n - 4)]).normalize(); at.copy(pts[n - 1]).addScaledVector(way, dd - down[n - 1]); return; }
    let k = 0; while (k < n - 2 && down[k + 1] < dd) k++;
    const f = (dd - down[k]) / Math.max(1e-6, down[k + 1] - down[k]);
    at.copy(pts[k]).lerp(pts[k + 1], f);
    way.copy(pts[Math.min(n - 1, k + 2)]).sub(pts[Math.max(0, k - 1)]).normalize();
  }
  /**
   * HER PLACENTA DELIVERED (birthSequence.ts AFTERBIRTH; Joshua, 2026-11-03: it comes on its own after the cut, or sooner
   * with DELIVER PLACENTA, into a bowl): the disc as it grew on her womb's lining, moved as a whole -- peeled off toward
   * the top of her cervix, turned edge-first and folded soft (`AFTERBIRTH.fold`) down her canal, out of her opening the way
   * her canal points, and into the bowl, opening out as it goes -- one transform of that laid disc, in her
   * frame. False while it is still where it grew. In the bowl it lies open, its own side up (openPlacenta), lifted until
   * none of it is below the bowl's inside (`g`, the disc as drawn, is read for that).
   */
  const abMatrix = new THREE.Matrix4(), abC = new THREE.Vector3(), abP = new THREE.Vector3(), abU = new THREE.Vector3(), abW = new THREE.Vector3();
  const abN = new THREE.Vector3(), abA = new THREE.Vector3(), abQ = new THREE.Quaternion(), abQ2 = new THREE.Quaternion(), abI = new THREE.Quaternion();
  const abB = new THREE.Matrix4(), abD = new THREE.Matrix4(), abR = new THREE.Matrix4(), abT = new THREE.Matrix4(), abEnd = new THREE.Vector3(), abUp = new THREE.Vector3(), abBowl = new THREE.Vector3();
  function afterbirthMatrix(pl: PlacentaSpot, m: BirthMoment, c: CanalHere, out: THREE.Matrix4, g: THREE.BufferGeometry | null = null): boolean {
    if (!(m.placentaFor >= 0)) return false;
    const F = AFTERBIRTH.fold, sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const n0 = pl.normal, half = pl.radius * F.along;
    // its middle as it grew (on her lining, carried by her belly's swing), and where it goes
    abC.copy(pl.at).addScaledVector(n0, pl.thick / 2);
    const s = sm(0, 1, m.separate), pd = m.placentaDown, b = sm(0, 1, m.bowl);
    if (pd <= 0) {
      // peeled off: toward the top of her cervix, its leading edge there
      canalAt(c, -half, abP, abU);
      abW.copy(abC).add(jiggle.belly.value);
      abP.lerp(abW, 1 - s);
    // down her canal, its leading edge from the top of her cervix to her opening (1); then out of her, until its trailing
    // edge is clear of her (2) -- its middle at her opening at 1.5
    } else if (pd <= 1) canalAt(c, -half + c.length * pd, abP, abU);
    else canalAt(c, c.length - half + (2 * half + AFTERBIRTH.clear) * (pd - 1), abP, abU);
    // into the bowl: from just out of her, over and down into it
    if (b > 0 && afterBowl) {
      canalAt(c, c.length + half + AFTERBIRTH.clear, abEnd, abW);
      abUp.set(0, 1, 0).transformDirection(holderInv);
      abBowl.copy(bowlWorld).addScaledVector(WORLD_UP, (AFTERBIRTH.bowl.floor + pl.thick * F.thick * AFTERBIRTH.inBowlFold * 0.5 + pl.thick * 0.5) * M).applyMatrix4(holderInv);
      abP.copy(abEnd).lerp(abBowl, b).addScaledVector(abUp, AFTERBIRTH.arc * Math.sin(Math.PI * b));
    }
    // turned edge-first along the way it travels (its face kept as near as it can be to how it lay), then flat in the bowl
    abN.copy(n0).addScaledVector(abU, -n0.dot(abU));
    if (abN.lengthSq() < 1e-8) abN.set(abU.y, -abU.x, 0);
    abN.normalize();
    abQ2.setFromUnitVectors(n0, abN);
    abQ.copy(abI.identity()).slerp(abQ2, sm(0.3, 1, m.separate));
    if (b > 0) { abQ2.setFromUnitVectors(n0, abUp); abQ.slerp(abQ2, b); }
    // folded soft across its travel while it comes down and out (most in her canal), opening out into the bowl
    const f = sm(0.4, 1, m.separate) * (1 - (1 - AFTERBIRTH.inBowlFold) * b);
    abN.copy(n0).applyQuaternion(abQ);
    abU.addScaledVector(abN, -abU.dot(abN));
    if (abU.lengthSq() < 1e-8) abU.set(abN.y, -abN.x, 0);
    abU.normalize(); abA.crossVectors(abN, abU).normalize();
    abB.makeBasis(abU, abA, abN);
    abD.makeScale(1 - (1 - F.along) * f, 1 - (1 - F.across) * f, 1 + (F.thick - 1) * f);
    abR.makeRotationFromQuaternion(abQ);
    abT.makeTranslation(-abC.x, -abC.y, -abC.z);
    out.makeTranslation(abP.x, abP.y, abP.z).multiply(abB).multiply(abD).multiply(abB.clone().transpose()).multiply(abR).multiply(abT);
    // (in the bowl: lifted, as it comes down into it, until none of it is under the bowl's inside)
    if (b > 0 && g && babyHolder) {
      const lift = bowlLift(g, out);
      if (lift > 0) { abW.copy(abUp).multiplyScalar(lift * b); out.premultiply(abT.makeTranslation(abW.x, abW.y, abW.z)); }
    }
    return true;
  }
  /**
   * The placenta opening out as it goes into the bowl (`share` 0 as it grew on her lining .. 1 open, baby.ts
   * placentaOpen): laid on her lining it is a shell as deep as her womb's curve -- 17 cm deep lying in a 26 cm bowl,
   * standing up out of it -- so its points move from that shell to a lens dished `AFTERBIRTH.dish` at its rim. Back to
   * the shell whenever it is not on its way into the bowl (a drag back, RESET).
   */
  function openPlacenta(m: THREE.Mesh, pl: PlacentaSpot, share: number): void {
    const u = m.userData as { open?: number; curved?: Float32Array | null; opened?: Float32Array | null; openFor?: PlacentaSpot };
    if (Math.abs((u.open ?? 0) - share) < 1e-3) return;
    const a = m.geometry.getAttribute('position') as THREE.BufferAttribute, P = a.array as Float32Array;
    if (!u.curved) u.curved = Float32Array.from(P);
    if (u.openFor !== pl || !u.opened) { u.opened = placentaOpen(pl, AFTERBIRTH.dish); u.openFor = pl; }
    const C = u.curved, O = u.opened, t = share * share * (3 - 2 * share);
    for (let k = 0; k < P.length; k++) P[k] = C[k] + (O[k] - C[k]) * t;
    a.needsUpdate = true; m.geometry.computeVertexNormals(); m.geometry.computeBoundingSphere();
    u.open = share;
  }
  /** How far (her frame's units, along her up) the disc drawn by `mat` must rise for none of it to be under the bowl's inside. */
  const liftV = new THREE.Vector3();
  function bowlLift(g: THREE.BufferGeometry, mat: THREE.Matrix4): number {
    const a = g.getAttribute('position'), per = babyHolder!.matrixWorld.getMaxScaleOnAxis(), B = AFTERBIRTH.bowl;
    let need = 0;
    for (let k = 0; k < a.count; k++) {
      liftV.fromBufferAttribute(a, k).applyMatrix4(mat).applyMatrix4(babyHolder!.matrixWorld);
      const r = Math.hypot(liftV.x - bowlWorld.x, liftV.z - bowlWorld.z) / M;
      if (r > B.rim) continue;
      need = Math.max(need, bowlWorld.y + bowlInside(r) * M - liftV.y);
    }
    return need / per;
  }
  /** The placenta as world points while it crosses her opening (her rim hugs it as it did her baby), or null. */
  function placentaPassing(): Float32Array | null {
    // (the one crossing her opening now: twins and triplets each have their own, one after another)
    const k = birthNow ? birthNow.placentas.findIndex((p) => p.placentaDown > AFTERBIRTH.hugFrom && p.placentaDown < AFTERBIRTH.hugTo) : -1;
    const m = placentaMeshes[k];
    if (!m || !birthNow) return null;
    m.updateMatrixWorld(true);
    const a = m.geometry.getAttribute('position'), v = new THREE.Vector3(), pts: number[] = [];
    for (let k = 0; k < a.count; k += 2) { v.fromBufferAttribute(a, k).applyMatrix4(m.matrixWorld); pts.push(v.x, v.y, v.z); }
    return Float32Array.from(pts);
  }
  /**
   * THE BOWL (Joshua, 2026-11-03: the placenta goes "into a small bowl beside her on the bed"): a small steel bowl on the
   * bed she reclines on (RECLINE's support, at RECLINE_HIPS_M, is not drawn: the bowl sits where it would be), a little
   * past her opening and to her right, put there as its cord is cut; the placenta, coming out of her, goes over into it.
   * (Right in front of her opening, as a midwife holds one, it stood between the camera and her; beside her hip it was
   * under her raised thigh.) In the world (it does not move with her), `bowlWorld` its bottom's middle.
   */
  let afterBowl: THREE.Mesh | null = null;
  const bowlWorld = new THREE.Vector3(), WORLD_UP = new THREE.Vector3(0, 1, 0);
  function bowlInside(r: number): number {
    // the height of the bowl's inside at `r` from its middle (metres): flat to `bottom`, curving up to its rim
    const B = AFTERBIRTH.bowl;
    if (r <= B.bottom) return B.floor;
    return B.floor + (B.depth - B.floor) * Math.pow(Math.min(1, (r - B.bottom) / (B.rim - B.bottom)), 1.6);
  }
  function placeBowl(show: boolean): void {
    if (!show) { if (afterBowl) afterBowl.visible = false; return; }
    if (!afterBowl) {
      const B = AFTERBIRTH.bowl, prof: THREE.Vector2[] = [];
      // (its outside up from the floor, over its lip, and its inside back down)
      for (let k = 0; k <= 12; k++) { const r = B.bottom * 0.92 + (B.rim - B.bottom * 0.92) * Math.pow(k / 12, 0.7); prof.push(new THREE.Vector2(r * M, (bowlInside(Math.max(B.bottom, r)) - B.floor) * M)); }
      prof.push(new THREE.Vector2((B.rim + 0.006) * M, B.depth * M), new THREE.Vector2(B.rim * M, (B.depth + 0.004) * M));
      for (let k = 12; k >= 0; k--) { const r = B.bottom + (B.rim - 0.004 - B.bottom) * (k / 12); prof.push(new THREE.Vector2(r * M, bowlInside(r) * M)); }
      prof.push(new THREE.Vector2(0, B.floor * M));
      afterBowl = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 0.85, roughness: 0.28, side: THREE.DoubleSide }));
      afterBowl.name = 'afterbirth-bowl';
      three.add(afterBowl);
    }
    if (!afterBowl.visible || !afterBowl.userData.placed) {
      // beside her on the bed: on the bed's level under her opening, to her right, a little past her opening along its
      // way out (flattened)
      const pp = birthPath?.points, k = pp ? pp.length - 1 : -1;
      if (!pp || k < 3) return;
      const mouth = pp[k], way = pp[k].clone().sub(pp[k - 3]); way.y = 0;
      if (way.lengthSq() < 1e-10) way.set(0, 0, 1);
      way.normalize();
      const right = new THREE.Vector3().crossVectors(way, WORLD_UP).normalize();
      bowlWorld.set(mouth.x, Math.max(pose === 'squat' ? BIRTH_MAT.thick * M : 0, mouth.y - AFTERBIRTH.bowl.below * M), mouth.z).addScaledVector(way, (pose === 'squat' ? AFTERBIRTH.bowl.squatAhead : AFTERBIRTH.bowl.ahead) * M).addScaledVector(right, (pose === 'squat' ? AFTERBIRTH.bowl.squatSide : AFTERBIRTH.bowl.side) * M);
      afterBowl.position.copy(bowlWorld); afterBowl.userData.placed = true;
    }
    afterBowl.visible = true;
  }
  /**
   * THE BASSINET (P3): a small basket on four legs beside the bed, to her left, for a triplet's third -- in the world, as
   * the bowl is (it does not move with her); `bassinetWorld` the middle of its mattress's top, `bassinetWay` along it
   * toward her head.
   */
  let bassinet: THREE.Group | null = null;
  const bassinetWorld = new THREE.Vector3(), bassinetWay = new THREE.Vector3();
  function placeBassinet(show: boolean): void {
    if (!show) { if (bassinet) { bassinet.visible = false; bassinet.userData.placed = false; } return; }
    const B = BASSINET;
    if (!bassinet) {
      bassinet = new THREE.Group(); bassinet.name = 'bassinet';
      const cloth = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
      const wood = new THREE.MeshStandardMaterial({ color: 0xc9a77c, roughness: 0.6, metalness: 0 });
      const sheet = new THREE.MeshStandardMaterial({ color: 0xdfe9f2, roughness: 0.9, metalness: 0 });
      // its basket: a rounded tub (a lathe), stretched to its length
      const prof: THREE.Vector2[] = [], r0 = B.wide / 2;
      for (let k = 0; k <= 10; k++) { const a = (k / 10) * (Math.PI / 2); prof.push(new THREE.Vector2((r0 - 0.06 + 0.06 * Math.sin(a)) * M, (0.06 - 0.06 * Math.cos(a)) * M)); }
      prof.push(new THREE.Vector2(r0 * M, B.deep * M), new THREE.Vector2((r0 + B.wall) * M, (B.deep + 0.005) * M), new THREE.Vector2((r0 + B.wall) * M, 0.04 * M), new THREE.Vector2((r0 - 0.05) * M, -B.wall * M), new THREE.Vector2(0, -B.wall * M));
      const tub = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), cloth); tub.scale.set(B.long / B.wide, 1, 1);
      const mat = new THREE.Mesh(new THREE.CylinderGeometry((r0 - 0.03) * M, (r0 - 0.03) * M, B.mattress * M, 40), sheet); mat.scale.set(B.long / B.wide, 1, 1); mat.position.y = (B.mattress / 2 + 0.005) * M;
      bassinet.add(tub, mat);
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(B.legs / 2 * M, B.legs / 2 * M, 1, 12), wood); leg.name = 'leg';
        leg.position.set(sx * (B.long / 2 - 0.08) * M, 0, sz * (r0 - 0.06) * M); bassinet.add(leg);
      }
      three.add(bassinet);
    }
    if (!bassinet.userData.placed) {
      // beside the bed: to her left of her opening, up the bed toward her head, its rim a little over the bed's level
      const pp = birthPath?.points, k = pp ? pp.length - 1 : -1;
      if (!pp || k < 3) return;
      const mouth = pp[k], way = pp[k].clone().sub(pp[k - 3]); way.y = 0;
      if (way.lengthSq() < 1e-10) way.set(0, 0, 1);
      way.normalize();
      const left = new THREE.Vector3().crossVectors(WORLD_UP, way).normalize();
      // (and never lower than a bassinet stands: sat on the mat, her opening is near the floor)
      const rim = Math.max(mouth.y + B.rimAbove * M, B.rimLeast * M), bottom = rim - B.deep * M;
      bassinet.position.copy(mouth).addScaledVector(left, B.out * M).addScaledVector(way, -B.up * M); bassinet.position.y = bottom;
      // (its length along the bed)
      bassinet.rotation.set(0, Math.atan2(way.x, way.z) + Math.PI / 2, 0);
      for (const c of bassinet.children) if (c.name === 'leg') { c.scale.y = Math.max(0.01, bottom); c.position.y = -bottom / 2; }
      bassinetWay.copy(way).negate();
      bassinetWorld.copy(bassinet.position).setY(bottom + (B.mattress + 0.005) * M);
      bassinet.userData.placed = true;
    }
    bassinet.visible = true;
  }
  /** Where a triplet's third lies in the bassinet (her rest frame, as birthRestPlace): on its back, its head toward hers. */
  function bassinetPlace(scale: number): { position: THREE.Vector3; quaternion: THREE.Quaternion } | null {
    if (!bassinet?.userData.placed || !babyHolder || !babyCurl) return null;
    babyHolder.updateMatrixWorld(true);
    const inv = babyHolder.matrixWorld.clone().invert();
    const long = bassinetWay.clone().transformDirection(inv), back = new THREE.Vector3(0, -1, 0).transformDirection(inv);
    back.addScaledVector(long, -back.dot(long)).normalize();
    const side = new THREE.Vector3().crossVectors(long, back).normalize();
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, long, back).multiply(new THREE.Matrix4().makeBasis(babyCurl.side, babyCurl.long, babyCurl.back).transpose()));
    const centre = babyHolder.worldToLocal(bassinetWorld.clone()).addScaledVector(back, -BIRTH_REST.depth * babyCurl.size.z * scale);
    return { position: centre.sub(babyCurl.centre.clone().multiplyScalar(scale).applyQuaternion(q)), quaternion: q };
  }
  /** Kept out of the floor and the bowl (world point, a cord's `radius` in world units). */
  function keepOffFloor(pw: THREE.Vector3, radius: number): void {
    if (afterBowl?.visible) {
      const r = Math.hypot(pw.x - bowlWorld.x, pw.z - bowlWorld.z) / M;
      if (r < AFTERBIRTH.bowl.rim) { const inside = bowlWorld.y + bowlInside(r) * M + radius; if (pw.y < inside) pw.y = inside; return; }
    }
    if (pw.y < radius) pw.y = radius;
  }
  /**
   * Its cord out of her (CORD_CUT): from her opening to its navel, hanging, until it is cut (birthSequence.ts: on its own
   * a while after it is settled on her, or sooner with CUT CORD) -- and then its stump on its navel, its cut end closed,
   * and the rest of it hanging out of her opening from the placenta inside her, coming out with the placenta and lying
   * with it in the bowl.
   */
  function layCordOut(out: boolean, radius: number, bodies: CordBody[], canal: CanalHere | null, i = 0, pd = 0): void {
    const holder = babyHolder!;
    const tube = (): THREE.Mesh => { const t = new THREE.Mesh(cordTube(), cordMat); t.frustumCulled = false; t.renderOrder = 3; holder.add(t); return t; };
    cordOuterMesh ??= tube(); cordStumpMesh ??= tube(); cordRemnantMesh ??= tube();
    for (const t of [cordOuterMesh, cordStumpMesh, cordRemnantMesh]) if (t.parent !== holder) holder.add(t);
    cordOuterMesh.visible = out && !cordCut; cordStumpMesh.visible = out && cordCut; cordRemnantMesh.visible = out && cordCut;
    // inside her, once cut: from the placenta to her opening (SEE BABY), and nothing once the placenta is out of her
    // (its cord leaves the placenta's middle, which crosses her opening at 1.5: afterbirthMatrix)
    if (cordMeshes[i]) cordMeshes[i].visible = babyShown && !(cordCut && pd >= 1.5);
    if (!out) return;
    // the way down in her frame; her skin kept off (her skin as sampled near it: softBaby's `onHerPush`), and the floor
    cordDown.set(0, -1, 0).transformDirection(holderInv);
    const per = new THREE.Vector3().setFromMatrixScale(holder.matrixWorld).x;
    const fresh = herSkin.frame === softFrame && herSkin.idx.length > 0;
    const keepOut = (p: THREE.Vector3) => {
      offHerAt.copy(p).applyMatrix4(holder.matrixWorld);
      if (fresh) {
        const [k] = nearestHerSkin(offHerAt);
        if (k >= 0) {
          offHerN.fromArray(herSkin.nrm, k * 3);
          const over = (offHerAt.x - herSkin.pos[k * 3]) * offHerN.x + (offHerAt.y - herSkin.pos[k * 3 + 1]) * offHerN.y + (offHerAt.z - herSkin.pos[k * 3 + 2]) * offHerN.z - radius * per;
          if (over < 0) offHerAt.addScaledVector(offHerN, -over);
        }
      }
      keepOffFloor(offHerAt, radius * per);
      p.copy(offHerAt).applyMatrix4(holderInv);
    };
    const dt = babyStepDt;
    if (!cordCut) {
      const want = Math.max(4 * radius, CORD_CUT.slack * cordOpen.distanceTo(navelAt));
      if (!cordOuter) cordOuter = new Cord(want, radius, 16);
      cordOuter.radius = radius;
      cordOuter.length = cordOuterLaid ? cordOuter.length + (want - cordOuter.length) * Math.min(1, dt * 4) : want;
      if (!cordOuterLaid) { cordOuter.lay(cordOpen, navelAt, cordToward.copy(cordOpen).add(navelAt).multiplyScalar(0.5).addScaledVector(cordDown, cordOuter.length)); cordOuterLaid = true; }
      cordOuter.step(dt, cordOpen, navelAt, babyWomb!, jiggle.belly.value, bodies, i, { inWomb: false, down: cordDown, bWay: navelWay, keepOut });
      layCordTube(cordOuterMesh.geometry, cordOuter.points, radius);
      return;
    }
    // its stump: held out of its navel, its cut end loose (drawn from that end, closed)
    if (!cordStump) cordStump = new Cord(CORD_CUT.stumpM, radius, CORD_CUT.stumpNodes);
    cordStump.radius = radius; cordStump.length = CORD_CUT.stumpM;
    if (!cordStumpLaid) { cordToward.copy(navelAt).addScaledVector(navelWay, CORD_CUT.stumpM); cordStump.lay(cordToward, navelAt, cordToward.clone().add(cordDown)); cordStumpLaid = true; }
    cordStump.step(dt, cordToward, navelAt, babyWomb!, jiggle.belly.value, bodies, i, { inWomb: false, freeA: true, down: cordDown, bWay: navelWay, keepOut });
    layCordTube(cordStumpMesh.geometry, reversed(cordStump.points), radius, true);
    // the rest of it, out of her: held at her opening (once the placenta is out, at the placenta), its cut end loose
    const held = pd >= 1.5 ? cordA : cordOpen;
    // (leaving her opening the way her canal points; once the placenta is out, leaving the placenta's face)
    if (pd >= 1.5) remnantWay.copy(placentaFace);
    else if (canal) canalAt(canal, canal.length + 0.01, cordToward, remnantWay); else remnantWay.copy(cordDown);
    if (!cordRemnant) cordRemnant = new Cord(AFTERBIRTH.hang, radius, AFTERBIRTH.hangNodes);
    cordRemnant.radius = radius; cordRemnant.length = AFTERBIRTH.hang;
    if (!cordRemnantLaid) {
      cordToward.copy(held).addScaledVector(cordDown, AFTERBIRTH.hang * 0.7).addScaledVector(remnantWay, AFTERBIRTH.hang * 0.3);
      cordRemnant.lay(cordToward, held, cordToward.clone().add(cordDown)); cordRemnantLaid = true;
      for (let k = 0; k < 30; k++) cordRemnant.step(1 / 60, cordToward, held, babyWomb!, jiggle.belly.value, [], -1, { inWomb: false, freeA: true, down: cordDown, bWay: remnantWay, keepOut });
    }
    cordRemnant.step(dt, cordToward, held, babyWomb!, jiggle.belly.value, [], -1, { inWomb: false, freeA: true, down: cordDown, bWay: remnantWay, keepOut });
    layCordTube(cordRemnantMesh.geometry, reversed(cordRemnant.points), radius, true);
  }
  /** A cord's points from its other end (so a tube's closed end is the loose one). */
  function reversed(P: Float32Array): Float32Array {
    const n = P.length / 3, out = new Float32Array(P.length);
    for (let k = 0; k < n; k++) out.set([P[(n - 1 - k) * 3], P[(n - 1 - k) * 3 + 1], P[(n - 1 - k) * 3 + 2]], k * 3);
    return out;
  }
  /** A womb shell (laid by `layShell`) with her kicks on it: out where each one is, as her belly is. */
  function bumpShell(mesh: THREE.Mesh): void {
    const K = jiggle.kickAt.value, D = jiggle.kickDir.value, base = mesh.userData.base as Float32Array | undefined;
    if (!base) return;
    const any = K.some((k) => k.w > 0);
    if (!any && !mesh.userData.bumped) return;
    const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute, P = pos.array as Float32Array;
    P.set(base);
    if (any) for (let v = 0; v < pos.count; v++) {
      const x = base[v * 3], y = base[v * 3 + 1], z = base[v * 3 + 2];
      for (let k = 0; k < K.length; k++) {
        if (!(K[k].w > 0)) continue;
        // (the shell is inside her skin: measured from the kick's own line, not its point on her skin)
        const dx = x - K[k].x, dy = y - K[k].y, dz = z - K[k].z, along = dx * D[k].x + dy * D[k].y + dz * D[k].z;
        const off2 = dx * dx + dy * dy + dz * dz - along * along, f = Math.exp(-off2 / (D[k].w * D[k].w)) * (along > -0.08 ? 1 : 0);
        P[v * 3] += D[k].x * K[k].w * f; P[v * 3 + 1] += D[k].y * K[k].w * f; P[v * 3 + 2] += D[k].z * K[k].w * f;
      }
    }
    mesh.userData.bumped = any; pos.needsUpdate = true;
  }
  const qMesh = new THREE.Quaternion(), qBone = new THREE.Quaternion(), qBind = new THREE.Quaternion(), toBody = new THREE.Quaternion();
  const accel = new THREE.Vector3(), vel = new THREE.Vector3(), felt = new THREE.Vector3(), side = new THREE.Vector3(), qSide = new THREE.Quaternion();

  /** Load the chosen model, putting away the one shown (MODEL switches v1 and v2). */
  function loadSarah(): void {
    dropCloth();
    // the brush's copy belongs to this body's material, which goes now
    dropPainter();
    // her hair goes with her body (it is in her model's tree); a request still under way is no longer wanted
    hairMeshes = []; hairRequest++;
    if (model) { three.remove(model); rig?.dispose(); release(model); model = null; }
    thorax?.dispose(); thorax = null; abdomen?.dispose(); abdomen = null; organs?.dispose(); organs = null; v2OrganBones = null; v2Womb = null; organsGrowWomb = false; abdomenFailed = false; thoraxFailed = false;
    skeletonV2?.dispose(); skeletonV2 = null; skeletonV2Request++; relaySkeletonV2 = null;
    // (and v2's opening with her: it is laid again when a v2 body comes; kept, it stood in for her skeleton's in a birth)
    vulva?.dispose(); vulva = null;
    dropBabyHolder();
    ownFingers?.dispose(); ownFingers = null; withFingers = null; fingerFills?.dispose(); fingerFills = null;
    rig = null; measure = null; fingers = []; skinned = []; shaped = []; garments = []; hasBelly = false; anchors = null; legAnchors = null; navel = null; sidesAt = []; babyAt = []; chestAt = []; milkAt = []; groinAt = [];
    buildRig = null; bonesBuilt = ''; standLift = 0;
    sneakers?.dispose(); sneakers = null;
    crease.reset(); if (creaseTimer) { clearTimeout(creaseTimer); creaseTimer = 0; }
    recovered = false; partMeshes.clear(); wantedOutfit = null; outfitRequest++;
    for (const run of inflight.values()) run.abort.abort();
    inflight.clear();
    settleMasses(); loaded = false; failed = false;
    const entry = SARAH_LAB_MODELS[modelIndex], skin = hooks.skin ?? null, path = sarahModelPath(entry, skin);
    if (skin === 'ktx2') assets.enableKtx2(ctx.renderer.gl);
    // THE ORDER (Joshua, 2026-10-20): the room, then her, then what she has on -- only that outfit, its files asked for
    // the moment her body's bytes are in, so its download runs while her body is being built rather than after it
    const planned = hooks.nativeOutfitPreview !== true && entry.id === 'v2-body' ? recoveredPartsFor(wornGarments(outfit, [...GARMENTS, ...RECOVERED_SHIRTS])) : [];
    begin(OPENING_LABEL, 'centre');
    meter.expect(path, assets.assetBytes(path));
    for (const p of planned) meter.expect(recoveredPartPath(p), assets.assetBytes(recoveredPartPath(p)));
    refresh();
    let asked = false;
    const askForClothes = () => { if (!asked) { asked = true; for (const p of planned) void requestPart(p); } };
    // her refined 0% shape and round navel (zeroRefine.ts, Joshua 2026-10-29), fetched beside her body file
    const zeroData = entry.id === 'v2-body' && hooks.nativeOutfitPreview !== true ? loadZeroRefine(assets.assetUrl(ZERO_REFINE_PATH)) : Promise.resolve(null);
    void assets.loadModel(path, () => new THREE.Object3D(), { meter, onDownloaded: askForClothes }).then(async (loadedModel) => {
      if (disposed || path !== sarahModelPath(SARAH_LAB_MODELS[modelIndex], skin)) { release(loadedModel); return; }
      if (loadedModel.userData.isPlaceholder === true) { failed = true; failLoad('Sarah', () => loadSarah()); refresh(); return; }
      try {
        rig = new HumanRig(loadedModel);
        measure = measureHuman(rig.bind);
        fingers = findFingers(rig.bind, measure);
      } catch (error) {
        console.error('[sarahlab] the base model could not be rigged; it stands in its bind pose', error);
        rig = null;
        measure = null;
      }
      loadedModel.scale.setScalar(M);
      const approvedSkin = findSkinnedMesh(loadedModel);
      recovered = hooks.nativeOutfitPreview !== true && SARAH_LAB_MODELS[modelIndex].id === 'v2-body' && approvedSkin?.geometry.attributes.position.count === 115710 && approvedSkin.skeleton.bones.length === 68;
      if (recovered) {
        loadedModel.updateMatrixWorld(true);
        loadedModel.traverse(n => {
          const m = n as THREE.SkinnedMesh;
          if (!m.isSkinnedMesh) return;
          const name = (Array.isArray(m.material) ? m.material[0] : m.material).name;
          // both rises are replaced by their recovered, fitted copies (the low pair too, Joshua 2026-10-20: its waistband
          // dug into her belly from ~140% once her body was never hidden)
          if (name === 'leggings' || name === 'leggingsTrim' || name === 'leggingsLow' || name === 'leggingsLowTrim') m.userData.replacedByRecovered = true;
          if (name === 'bikini' && m.geometry.index) {
            const v = new THREE.Vector3(); let max = -Infinity;
            for (const i of m.geometry.index.array) { m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld); max = Math.max(max, v.y); }
            if (max < 110) m.userData.replacedByRecovered = true;
          }
        });
      } else {
        // not the body the recovered clothes were fitted to: nothing fetched for it is any use
        for (const run of inflight.values()) run.abort.abort();
        inflight.clear();
      }
      const found = new Set<Garment>();
      loadedModel.traverse((n) => {
        const mesh = n as THREE.SkinnedMesh;
        if (mesh.isSkinnedMesh !== true) return;
        mesh.frustumCulled = false;
        skinned.push(mesh);
        // the body's shape fields come off the GPU's list before the first draw (bodyShapeView)
        const lifted = liftShapeFields(mesh);
        if (lifted) shaped.push({ mesh, fields: lifted });
        // on the approved v2 body every part can take her build, shape fields or none
        else if (recovered) shaped.push({ mesh, fields: baseShapeFields(mesh) });
        // shapes that move nothing on this part are not sent to the GPU (morphPrune.ts)
        dropIdleMorphs(mesh);
        if (mesh.morphTargetDictionary?.[BELLY_TARGET] !== undefined) hasBelly = true;
        // her belly and breasts move it as the masses swing (softBody.ts); bones have no flesh to swing
        if (!fleshlessModel(SARAH_LAB_MODELS[modelIndex].id)) attachJiggle(mesh, jiggle, legBonesOf(loadedModel));
        const name = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material).name;
        if (([...GARMENTS, ...RECOVERED_SHIRTS] as readonly string[]).includes(name)) found.add(name as Garment);

      });
      // on the approved v2 body every garment with its own file is on hand (the slim body file no longer carries the
      // leggings it replaced)
      garments = [...GARMENTS, ...RECOVERED_SHIRTS].filter((g) => found.has(g) || (recovered && RECOVERED_GARMENTS.includes(g)));
      // her build is measured on her approved v2 body (its rest, as approved, before any shape is laid on it)
      if (recovered && measure) {
        const b = bodyOf(), s = b ? shaped.find((x) => x.mesh === b.mesh) : undefined;
        try { buildRig = b && s ? prepareBuildRig(b.mesh, s.fields.basePos, measure.joints, FACE_REST_SCALE) : null; } catch (error) { console.error('[sarahlab] her build could not be measured; BUILD is off', error); buildRig = null; }
      }
      if (!recovered && outfit >= 5) outfit = 0;
      model = loadedModel;
      // her refined 0% shape and her navel as its own piece (zeroRefine.ts), put on her approved body when the file is
      // in -- fetched beside her body file and almost always there first; it never holds up her loading
      if (recovered) void zeroData.then((zero) => {
        const b = bodyOf(), s = b ? shaped.find((x) => x.mesh === b.mesh) : undefined;
        if (!zero || disposed || model !== loadedModel || !b || !s) return;
        const z = applyZeroRefine(s.mesh, s.fields, zero);
        if (!z) return;
        s.fields = z.fields; navel = { mesh: b.mesh, piece: z.navel };
        // (her navel drawn as part of her soft belly: laid in and out, blended by the shaders)
        try { navelSoft?.dispose(); navelSoft = createNavelSoft(b.mesh, z.navel); for (const m of (Array.isArray(b.mesh.material) ? b.mesh.material : [b.mesh.material])) navelSoft.patch(m); } catch (error) { console.error('[sarahlab] her navel could not be made soft; laid as it was', error); navelSoft = null; } sidesAt = sidesAnchors(z.fields); chestAt = chestAnchors(z.fields); groinAt = groinAnchors(z.fields);
        applyLook();
        // then her baby-weight shapes, in the background: at 0 she is her approved belly, so nothing waits for them
        void loadWomb(assets.assetUrl(WOMB_PATH)).then((womb) => {
          const b2 = bodyOf(), s2 = b2 ? shaped.find((x) => x.mesh === b2.mesh) : undefined;
          if (!womb || disposed || model !== loadedModel || !b2 || !s2) return;
          const f = applyWomb(s2.mesh, s2.fields, womb);
          if (!f) return;
          s2.fields = f; babyAt = babyAnchors(f);
          // and her baby, which her belly makes room for (while she is pregnant: placeBaby loads it when she becomes so)
          if (pregnant()) loadBaby();
          refresh();
          applyLook();
        });
        // and her milk shapes, the same way: at 0 she is as approved
        void loadMilk(assets.assetUrl(MILK_PATH)).then((milk) => {
          const b2 = bodyOf(), s2 = b2 ? shaped.find((x) => x.mesh === b2.mesh) : undefined;
          if (!milk || disposed || model !== loadedModel || !b2 || !s2) return;
          const f = applyMilk(s2.mesh, s2.fields, milk);
          if (!f) return;
          s2.fields = f; milkAt = milkAnchors(f);
          refresh();
          applyLook();
        });
      });
      // and the skin chosen in FACE goes on (a candidate fetched once is kept for a body loaded again)
      applySkin();
      // and her hair, made for her approved v2 body
      loadHair();
      // and her face, on her approved v2 body only (its measurements are that file's)
      { const b = bodyOf(); faceMaterial = recovered && b ? b.material : null; if (faceMaterial) patchFaceRig(faceMaterial); }
      // she stays out of sight until what she has on is on: never undressed, then dressed a moment later
      loadedModel.visible = !recovered;
      three.add(loadedModel);
      // the masses' anchors: the belly in front of her spine, each breast on her chest (rest metres, x her left)
      const skinMesh = findSkinnedMesh(loadedModel);
      if (skinMesh && measure) {
        loadedModel.updateMatrixWorld(true);
        const bones = skinMesh.skeleton.bones, spine = bones[measure.joints.spine], chest = bones[measure.joints.chest];
        const bindOf = (bone: THREE.Bone) => {
          const k = bones.indexOf(bone), world = new THREE.Matrix4().copy(skinMesh.skeleton.boneInverses[k]).invert();
          const qb = new THREE.Quaternion(), qm = new THREE.Quaternion(), sc = new THREE.Vector3(), at = new THREE.Vector3();
          world.decompose(at, qb, sc); skinMesh.bindMatrix.decompose(at, qm, sc);
          return qm.invert().multiply(qb);
        };
        const at = (bone: THREE.Bone, x: number, y: number, z: number): Anchor => ({ bone, local: bone.worldToLocal(new THREE.Vector3(x * M, y * M, z * M)), bind: bindOf(bone), p: new THREE.Vector3(), v: new THREE.Vector3(), primed: 0 });
        if (spine && chest) anchors = { belly: at(spine, 0, 1.0, 0.2), breastL: at(chest, 0.088, 1.27, 0.08), breastR: at(chest, -0.088, 1.27, 0.08) };
        // each leg's thigh and calf: its mass hung from the middle of its bone
        { const lb = legBonesOf(loadedModel);
          if (lb) {
            const mid = (a: THREE.Bone, b: THREE.Bone): Anchor => { const w = a.getWorldPosition(new THREE.Vector3()).add(b.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5); return { bone: a, local: a.worldToLocal(w), bind: bindOf(a), p: new THREE.Vector3(), v: new THREE.Vector3(), primed: 0 }; };
            legAnchors = { thighL: mid(lb.left[0], lb.left[1]), thighR: mid(lb.right[0], lb.right[1]), calfL: mid(lb.left[1], lb.left[2]), calfR: mid(lb.right[1], lb.right[2]) };
          } }
        // her rest frame (metres) as her spine bone carries it: where the baby is laid
        if (spine) babyFrame = { bone: spine, matrix: new THREE.Matrix4().copy(spine.matrixWorld).invert().multiply(loadedModel.matrixWorld), meshToRest: restOfMesh(skinMesh, loadedModel) };
        // v3: her pelvic organs on her skeleton (the skeleton-outward plan, Phase 1), hung from her pelvis bone in her rest
        // frame as it carries it, read here at her bind
        const pelvisBone = bones[measure.joints.pelvis];
        // v2: her spine's bones with her rest frame as each carries it, read here at her bind, for her organs to hang from
        // (the rig's own names -- her pelvis, her lumbar spine below and above L3, her chest: src/data/torso/)
        if (SARAH_LAB_MODELS[modelIndex].id === 'v2-body') {
          const at = (name: string) => { const b = loadedModel.getObjectByName(name) as THREE.Bone | undefined; return b?.isBone ? { bone: b, matrix: new THREE.Matrix4().copy(b.matrixWorld).invert().multiply(loadedModel.matrixWorld) } : null; };
          const [p0, p1, p2, p3] = ORGAN_SPINE.map(at);
          v2OrganBones = p0 && p1 && p2 && p3 ? { pelvis: p0, lumbar: p1, upper: p2, chest: p3 } : null;
        }
        if (SARAH_LAB_MODELS[modelIndex].id === 'skeleton' && pelvisBone) {
          // (her babies are laid in her womb, so in the frame it hangs from)
          if (babyFrame) babyFrame = { ...babyFrame, bone: pelvisBone, matrix: new THREE.Matrix4().copy(pelvisBone.matrixWorld).invert().multiply(loadedModel.matrixWorld) };
          organsGrowWomb = true;
          organs = new PelvicOrgansView(skeletonPelvis, skeletonTorso, pelvisBone, new THREE.Matrix4().copy(pelvisBone.matrixWorld).invert().multiply(loadedModel.matrixWorld), M);
          organs.setOpening(birthOpenPct / 100); organs.setFold(foldBackPct / 100);
          three.add(organs.group);
          applyXray();
        }
        // v2: her skeleton laid inside her and bound to her own bones (skeletonInV2.ts), seen under X-RAY
        // (laid only when first wanted -- X-RAY raised, or her sneakers off -- not on every load: it reads her whole body,
        // seconds of work on a phone)
        skeletonV2Lay = null;
        const frameNow = babyFrame;
        if (recovered && frameNow) skeletonV2Lay = () => {
          skeletonV2Lay = null;
          const request = ++skeletonV2Request, toRest = frameNow.meshToRest.clone();
          void assets.loadModel(SARAH_SKELETON_MODEL, () => new THREE.Object3D(), {}).then((skel) => {
            if (disposed || request !== skeletonV2Request || !model) { release(skel); return; }
            try {
              // (her body itself: her clothes are copies of it, the same points, so the first skinned mesh may be a garment)
              const body = bodyOf()?.mesh;
              if (!body) throw new Error('her body is not found');
              skel.scale.setScalar(M); skel.updateMatrixWorld(true);
              const sm = findSkinnedMesh(skel);
              if (!sm) throw new Error('no skinned mesh in the skeleton file');
              // (each limb onto v2's own joints: her joints at bind, in her rest frame, from each file)
              const skelInv = new THREE.Matrix4().copy(skel.matrixWorld).invert(), skelBones = new Map(sm.skeleton.bones.map((b) => [b.name, b]));
              const bodyBind = new THREE.Matrix4().copy(body.bindMatrix).invert(), bodyBones = new Map(body.skeleton.bones.map((b, k) => [b.name, k]));
              const jt = measure?.joints, nameOf = (k: number | undefined) => (k === undefined ? '' : body.skeleton.bones[k]?.name ?? '');
              // (each leg on to the ball of its foot -- its ankle bone's first child -- so the foot is laid along v2's foot)
              const ballOf = (k: number) => { const c = body.skeleton.bones[k]?.children.find((o) => (o as THREE.Bone).isBone); return c?.name ?? ''; };
              void ballOf;
              const chains = jt ? [[jt.hipL, jt.kneeL, jt.ankleL], [jt.hipR, jt.kneeR, jt.ankleR], [jt.shoulderL, jt.elbowL, jt.wristL], [jt.shoulderR, jt.elbowR, jt.wristR]].map((c) => c.map(nameOf).filter(Boolean)) : [];
              // (her fingers left as they are: v2 draws its own over them)
              const noFit = new Set<string>();
              if (jt) for (const w of [jt.wristL, jt.wristR]) { const b = sm.skeleton.bones.find((x) => x.name === nameOf(w)); b?.traverse((o) => { if (o !== b) noFit.add(o.name); }); }
              // (her skull and jaw, and each foot's bones, moved in whole first: everything from her head and each ankle down)
              const under = (k: number | undefined) => { const out: string[] = [], b = k === undefined ? undefined : sm.skeleton.bones.find((x) => x.name === nameOf(k)); b?.traverse((o) => out.push(o.name)); return out; };
              // (her head joint is the skull's tip, carrying nothing: the skull is its parent bone, with her jaw)
              const headParent = jt ? sm.skeleton.bones.find((x) => x.name === nameOf(jt.head))?.parent : undefined, skull: string[] = [];
              headParent?.traverse((o) => skull.push(o.name));
              // (her feet are left as they are: in this room she wears her sneakers, and her body's feet are shaped to them)
              if (jt) for (const a of [jt.ankleL, jt.ankleR]) for (const b of under(a)) noFit.add(b);
              // (and each foot, the hybrid -- Joshua 2026-11-09, "Do a hybrid of both": its bones slid in up to a centimetre at
              // their real size, her bare foot's skin covering the rest, footCover.ts)
              const whole = [skull, ...(jt ? [under(jt.ankleL), under(jt.ankleR)] : [])].filter((g) => g.length);
              // (her pelvis onto her own hip joints -- v2's stand above the skeleton file's sockets -- her trunk shorter by
              // that above her sacrum, up to the base of her neck: skeletonInV2.ts LimbFit.trunk)
              const restOf = (bones: Map<string, THREE.Bone>, name: string) => { const b = bones.get(name); return b ? b.getWorldPosition(new THREE.Vector3()).applyMatrix4(skelInv) : null; };
              const v2RestOf = (name: string) => { const k = bodyBones.get(name); return k === undefined ? null : new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().multiplyMatrices(bodyBind, new THREE.Matrix4().copy(body.skeleton.boneInverses[k]).invert())).applyMatrix4(toRest); };
              let trunk: { raise: number; rigidTo: number; to: number; skip: Set<string> } | undefined;
              if (jt && SKELETON_TRUNK_ON_HIPS) {
                const rises = [jt.hipL, jt.hipR].map((h) => { const a = restOf(skelBones, nameOf(h)), b = v2RestOf(nameOf(h)); return a && b ? b.y - a.y : NaN; }), neck = restOf(skelBones, nameOf(jt.neck));
                const raise = (rises[0] + rises[1]) / 2;
                if (Number.isFinite(raise) && neck && Math.abs(raise) < 0.08) trunk = { raise, rigidTo: skeletonPelvis.landmarks.promontory[1], to: neck.y, skip: new Set(skull) };
              }
              const make = (wholeScale: (number | null)[] | undefined) => new SkeletonInV2(sm, restOfMesh(sm, skel), body, toRest, {
                chains, noFit, whole, wholeScale, trunk, wholeSlideMost: [Infinity, FOOT_SLIDE_MOST, FOOT_SLIDE_MOST],
                set: jt ? [jt.ankleL, jt.ankleR].map((a) => ({ names: under(a), pivot: nameOf(a), pitchDeg: FOOT_SET.pitchDeg, shift: FOOT_SET.shift })) : [],
                skeletonJoint: (name) => { const b = skelBones.get(name); return b ? b.getWorldPosition(new THREE.Vector3()).applyMatrix4(skelInv) : null; },
                v2Joint: (name) => { const k = bodyBones.get(name); return k === undefined ? null : new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().multiplyMatrices(bodyBind, new THREE.Matrix4().copy(body.skeleton.boneInverses[k]).invert())).applyMatrix4(toRest); },
              });
              // (her skull at its real size, only slid in: it fits her head so, back and up a little -- the head-size renders,
              // Joshua 2026-11-09; the Head slider grows and shrinks it with her head, it rides her head bone)
              skeletonV2 = make([1, 1, 1]);
              { const pj = jt ? nameOf(jt.pelvis) : '', k = bodyBones.get(pj); skeletonV2PelvisJoint = k === undefined ? null : new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().multiplyMatrices(bodyBind, new THREE.Matrix4().copy(body.skeleton.boneInverses[k]).invert())).applyMatrix4(toRest).toArray(); }
              // HER BARE FEET OVER HER FOOT BONES (footCover.ts; Joshua 2026-11-09): a field on her shape, drawn barefoot
              try {
                const sb = shaped.find((x) => x.mesh === body), feet = new Set<string>();
                if (jt) for (const a of [jt.ankleL, jt.ankleR]) for (const b of under(a)) feet.add(b);
                if (sb?.fields.baseNrm && feet.size) {
                  const base = sb.fields.basePos, bn = sb.fields.baseNrm, nm = new THREE.Matrix3().getNormalMatrix(toRest), w = new THREE.Vector3();
                  const rest = new Float32Array(base.length), restN = new Float32Array(bn.length), region: number[] = [];
                  for (let i = 0; i < base.length / 3; i++) {
                    w.fromArray(base, i * 3).applyMatrix4(toRest).toArray(rest, i * 3);
                    w.fromArray(bn, i * 3).applyMatrix3(nm).normalize().toArray(restN, i * 3);
                    if (rest[i * 3 + 1] < FOOT_COVER_BELOW) region.push(i);
                  }
                  const c = footCover(rest, restN, region, skeletonV2.restPointsOf(feet));
                  footCoverMm = +(c.most * 1000).toFixed(1);
                  if (c.index.length) {
                    const toGeom = new THREE.Matrix3().setFromMatrix4(toRest).invert(), pos = new Float32Array(c.delta.length);
                    for (let k = 0; k < c.index.length; k++) w.fromArray(c.delta, k * 3).applyMatrix3(toGeom).toArray(pos, k * 3);
                    sb.fields = { ...sb.fields, fields: new Map(sb.fields.fields).set(FOOT_COVER_FIELD, { index: c.index, pos, nrm: new Float32Array(pos.length) }), last: '' };
                    applyLook();
                  }
                }
              } catch (error) { console.error('[sarahlab] her bare feet could not be fitted over her foot bones', error); }
              // (a probe lays it again with set sizes: its skull at real size against a bigger head)
              relaySkeletonV2 = (scales) => { const was = skeletonV2?.mesh.visible ?? false; skeletonV2?.dispose(); skeletonV2 = make(scales ?? undefined); skeletonV2.visible = was; };
              applyXray(); refresh();
              // (its file stays loaded: the laid copy shares its material's maps)
            } catch (error) { console.error('[sarahlab] her skeleton could not be laid inside v2', error); skeletonV2 = null; release(skel); }
          });
        };
        if (xrayPct > 0 || !sneakersShown()) skeletonV2Lay?.();
        if (xrayPct > 0) layOrgansV2(); else if (skeletonOpening) layOrgansV2(false);
        babySkinAt = null; babyDepthOf = null;
        // her birth area shaped (birthArea.ts): a field on her body's shape, the same at every size
        if (babyFrame) {
          const bm = bodyOf()?.mesh, sb = shaped.find((x) => x.mesh === bm), ix = bm?.geometry.index;
          if (sb && sb.fields.baseNrm && ix && !sb.fields.fields.has(BIRTH_CLEFT_FIELD)) {
            const map = new Map(sb.fields.fields);
            // ALL her triangles, not the cut-down set drawn under her clothes (2026-10-31: built from that set, her
            // underwear's leg openings were open edges to the smoothing, which drew them apart into cracks up her groin)
            // HER FINGERS APART first (fingerSplit.ts; P4, Joshua 2026-11-05: "Separate in code"): where her mesh joins one
            // finger's side to the next past her webbing, the joins cut and each finger's side closed -- the triangles she is
            // drawn with, before anything below reads them
            fingerSplit = null;
            if (!fingersJoined) try {
              const R = babyFrame.meshToRest, bindInv = new THREE.Matrix4().copy(bm!.bindMatrix).invert(), v = new THREE.Vector3();
              const jointAt = (k: number): SplitV3 => v.setFromMatrixPosition(new THREE.Matrix4().multiplyMatrices(bindInv, new THREE.Matrix4().copy(bm!.skeleton.boneInverses[k]).invert())).applyMatrix4(R).toArray() as [number, number, number];
              const base = sb.fields.basePos, bn = sb.fields.baseNrm, rest = new Float32Array(base.length), restN = bn ? new Float32Array(bn.length) : undefined, nm = new THREE.Matrix3().getNormalMatrix(R);
              for (let i = 0; i < base.length; i += 3) v.set(base[i], base[i + 1], base[i + 2]).applyMatrix4(R).toArray(rest, i);
              if (bn && restN) for (let i = 0; i < bn.length; i += 3) v.set(bn[i], bn[i + 1], bn[i + 2]).applyMatrix3(nm).normalize().toArray(restN, i);
              const t0 = performance.now();
              fingerSplit = splitFingers(rest, (bm!.userData.allIndices as ArrayLike<number> | undefined) ?? ix.array, handsFingersOf(bm!).flat().map((f) => f.map(jointAt)), undefined, restN);
              fingerSplitMs = performance.now() - t0;
              if (fingerSplit.cut > 0) { bm!.userData.allIndices = fingerSplit.tris; bm!.geometry.setIndex(new THREE.BufferAttribute(Uint32Array.from(fingerSplit.tris), 1)); bm!.userData.coverMask = undefined; }
            } catch (error) { console.error('[sarahlab] her fingers could not be cut apart', error); fingerSplit = null; }
            const herTris = (bm!.userData.allIndices as ArrayLike<number> | undefined) ?? ix.array;
            // her birth-pose weights first: their leg openings say which of her skin is leg (birthGap.ts, vulvaMesh.ts)
            try { const jt = measure?.joints; birthWeights = jt ? createBirthWeights(bm!, babyFrame.meshToRest, jt.pelvis, jt.hipL, jt.hipR, jt.kneeL, jt.kneeR, herTris) : null; } catch (error) { console.error('[sarahlab] her birth-pose weights could not be made', error); birthWeights = null; }
            try { const jt = measure?.joints; ankleWeights = jt ? createAnkleWeights(bm!, babyFrame.meshToRest, [[jt.kneeL, jt.ankleL], [jt.kneeR, jt.ankleR]]) : null; } catch (error) { console.error('[sarahlab] her heel weights could not be made', error); ankleWeights = null; }
            try { fingerWeights = measure && fingerSplit ? createFingerWeights(bm!, babyFrame.meshToRest, handsFingersOf(bm!), fingerSplit, undefined, thumbsOf(bm!), herTris) : null; } catch (error) { console.error('[sarahlab] her finger weights could not be made', error); fingerWeights = null; }
            // (and laid now: nothing else asks for her look again until she is posed or dressed)
            fingerWeights?.apply(fingerWeightsOn ? 1 : 0);
            // HER OWN FINGERS (ownFingers.ts, ownFingersMesh.ts; Joshua, 2026-11-05: "hide the MeshyAI fingers, and instead
            // create your own cylinder fingers... and still use the same bones"): past her webbing her index, middle, ring
            // and little fingers are made on her bones, begun on the ring of her skin they leave; her thumbs are her own
            ownFingers?.dispose(); ownFingers = null; contactSet = null;
            if (fingerSplit && ownFingersWanted) try {
              const t0 = performance.now();
              ownFingers = createOwnFingers({ body: bm!, toRest: babyFrame.meshToRest, hands: ownHandsOf(bm!, babyFrame.meshToRest), owner: fingerSplit.owner, past: fingerSplit.past, tris: herTris, closing: fingerSplit.filled, measureFrom: sb.fields.basePos, options: ownFingersUnaligned ? { align: 0, ease: 3, centreAcross: false, cutBack: OWN_FINGERS.cut } : undefined });
              ownFingersMs = performance.now() - t0;
              if (ownFingers) { withFingers = Uint32Array.from(herTris); layOwnFingers(); }
            } catch (error) { console.error('[sarahlab] her own fingers could not be made; her file\'s are drawn', error); ownFingers?.dispose(); ownFingers = null; }
            const parts = birthAreaFields(sb.fields.basePos, sb.fields.baseNrm, herTris, babyFrame.meshToRest);
            if (parts.cleft.index.length) map.set(BIRTH_CLEFT_FIELD, parts.cleft);
            if (parts.lips.index.length) map.set(BIRTH_LIPS_FIELD, parts.lips);
            // and her inner thighs drawn back from her crotch in a birth pose (birthThighs.ts)
            { const thighs = birthThighsField(sb.fields.basePos, sb.fields.baseNrm, babyFrame.meshToRest); if (thighs.index.length) map.set(BIRTH_THIGHS_FIELD, thighs); }
            // and her lowest buttocks pressed in under her thighs, to curve with them (birthSeat.ts)
            { const seat = birthSeatField(sb.fields.basePos, sb.fields.baseNrm, babyFrame.meshToRest); if (seat.index.length) map.set(BIRTH_SEAT_FIELD, seat); }
            { const gap = birthGapField(sb.fields.basePos, sb.fields.baseNrm, babyFrame.meshToRest); if (gap.index.length) map.set(BIRTH_GAP_FIELD, gap); }
            // and each finger round where it was joined to the next (fingerSplit.ts): a shape field on her, from rest metres
            // into her geometry, its normals turned to face out from the finger's middle line
            if (fingerSplit && fingerSplit.round.index.length && sb.fields.baseNrm) {
              const R = fingerSplit.round, toGeom = new THREE.Matrix3().setFromMatrix4(babyFrame.meshToRest).invert(), toGeomN = new THREE.Matrix3().getNormalMatrix(babyFrame.meshToRest).invert();
              const pos = new Float32Array(R.delta.length), nrm = new Float32Array(R.delta.length), v = new THREE.Vector3(), base = sb.fields.baseNrm;
              for (let k = 0; k < R.index.length; k++) {
                v.fromArray(R.delta, k * 3).applyMatrix3(toGeom).toArray(pos, k * 3);
                v.fromArray(R.normal, k * 3).applyMatrix3(toGeomN).normalize();
                const i = R.index[k] * 3; nrm[k * 3] = v.x - base[i]; nrm[k * 3 + 1] = v.y - base[i + 1]; nrm[k * 3 + 2] = v.z - base[i + 2];
              }
              map.set(FINGERS_ROUND_FIELD, { index: R.index, pos, nrm });
            }
            // and her file's fingers given the finger's shape past her webbing (ownFingers.ts formFingers; Joshua 2026-11-05: "try
            // again the default fingers and fix the weights and stuff"): from rest metres into her geometry, its normals too
            fingersFormed = 0;
            let fillsMade: { tris: number[]; round: RoundFills } | null = null;
            if (fingerSplit && sb.fields.baseNrm && !ownFingers) try {
              const R0 = babyFrame.meshToRest, base = sb.fields.basePos, v = new THREE.Vector3(), rest = new Float32Array(base.length);
              for (let i = 0; i < base.length; i += 3) v.set(base[i], base[i + 1], base[i + 2]).applyMatrix4(R0).toArray(rest, i);
              const hands = ownHandsOf(bm!, R0), bindInv = new THREE.Matrix4().copy(bm!.bindMatrix).invert();
              const jointAt = (k: number): SplitV3 => new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().multiplyMatrices(bindInv, new THREE.Matrix4().copy(bm!.skeleton.boneInverses[k]).invert())).applyMatrix4(R0).toArray() as [number, number, number];
              const R = formFingers(rest, herTris, fingerSplit.owner, hands.flatMap((h) => h.fingers.map((chain) => chain.map(jointAt))), hands.flatMap((h) => h.fingers.map(() => h.back)));
              // (her points as they are shaped)
              const Q = Float32Array.from(rest); for (let k = 0; k < R.index.length; k++) for (let c = 0; c < 3; c++) Q[R.index[k] * 3 + c] += R.delta[k * 3 + c];
              if (fingerSplit.filled > 0) {
                // her thin triangles round her hands joined better, as she is shaped (betterTris.ts), within a hand's reach of
                // the middle of its knuckles; and her fingers' closing laid round them (fingerFillShape.ts)
                const T = herTris.length / 3, first = (T - fingerSplit.filled) * 3, all = Array.from(herTris);
                const nbR = sb.fields.baseNrm, nm = new THREE.Matrix3().getNormalMatrix(R0), restN = new Float32Array(nbR.length);
                for (let i = 0; i < nbR.length; i += 3) v.set(nbR[i], nbR[i + 1], nbR[i + 2]).applyMatrix3(nm).normalize().toArray(restN, i);
                const centres = hands.map((h) => { const c = [0, 0, 0]; for (const f of h.fingers) { const k = jointAt(f[0]); c[0] += k[0] / h.fingers.length; c[1] += k[1] / h.fingers.length; c[2] += k[2] / h.fingers.length; } return c; });
                const nearHand = (i: number) => centres.some((c) => Math.hypot(Q[i * 3] - c[0], Q[i * 3 + 1] - c[1], Q[i * 3 + 2] - c[2]) < HAND_REACH);
                const herPart = all.slice(0, first), uvs = bm!.geometry.getAttribute('uv') as THREE.BufferAttribute | undefined;
                const better = betterTris(Q, herPart, (t) => nearHand(herPart[t * 3]) && nearHand(herPart[t * 3 + 1]) && nearHand(herPart[t * 3 + 2]), restN, uvs ? (uvs.array as ArrayLike<number>) : undefined);
                betterTurned = better.turned;
                const closing = all.slice(first), round = roundFills(Q, closing, better.tris, fingerSplit.owner, (f, p) => R.place(f, p));
                fillsMade = { tris: [...better.tris, ...closing], round };
                // (the points round each closing facing as the skin either side of them now lies, hers and the closing laid
                // round -- not the straight closing across the hole, which tilted them in: a dark line down her finger)
                const keyOf = (i: number) => `${Math.round(Q[i * 3] / 2e-5)},${Math.round(Q[i * 3 + 1] / 2e-5)},${Math.round(Q[i * 3 + 2] / 2e-5)}`;
                const rim = new Map<string, [number, number, number]>(); for (const i of closing) rim.set(keyOf(i), [0, 0, 0]);
                const at = (i: number): [number, number, number] => {
                  if (i < round.base) return [Q[i * 3], Q[i * 3 + 1], Q[i * 3 + 2]];
                  const k = i - round.base, p: [number, number, number] = [round.offset[k * 3], round.offset[k * 3 + 1], round.offset[k * 3 + 2]];
                  for (let j = 0; j < 3; j++) for (let c = 0; c < 3; c++) p[c] += round.bary[k * 3 + j] * Q[round.parents[k * 3 + j] * 3 + c];
                  return p;
                };
                for (const list of [better.tris, round.tris]) for (let t = 0; t + 2 < list.length; t += 3) {
                  const vs = [list[t], list[t + 1], list[t + 2]], hit = vs.map((i) => (i < round.base ? rim.get(keyOf(i)) : undefined));
                  if (!hit.some(Boolean)) continue;
                  const A = at(vs[0]), B = at(vs[1]), C = at(vs[2]), u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], w = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
                  const f = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
                  for (const e of hit) if (e) { e[0] += f[0]; e[1] += f[1]; e[2] += f[2]; }
                }
                for (let k = 0; k < R.index.length; k++) { const e = rim.get(keyOf(R.index[k])); if (e && Math.hypot(...e) > 0) { const l = Math.hypot(...e); R.normal[k * 3] = e[0] / l; R.normal[k * 3 + 1] = e[1] / l; R.normal[k * 3 + 2] = e[2] / l; } }
              }
              const toGeom = new THREE.Matrix3().setFromMatrix4(R0).invert(), toGeomN = new THREE.Matrix3().getNormalMatrix(R0).invert();
              const pos = new Float32Array(R.delta.length), nrm = new Float32Array(R.delta.length), nb = sb.fields.baseNrm;
              for (let k = 0; k < R.index.length; k++) {
                v.fromArray(R.delta, k * 3).applyMatrix3(toGeom).toArray(pos, k * 3);
                v.fromArray(R.normal, k * 3).applyMatrix3(toGeomN).normalize();
                const i = R.index[k] * 3; nrm[k * 3] = v.x - nb[i]; nrm[k * 3 + 1] = v.y - nb[i + 1]; nrm[k * 3 + 2] = v.z - nb[i + 2];
              }
              if (R.index.length) { map.set(FINGERS_FORM_FIELD, { index: R.index, pos, nrm }); fingersFormed = R.index.length; }
            } catch (error) { console.error('[sarahlab] her fingers could not be given their shape', error); fingersFormed = 0; fillsMade = null; }
            // her file's fingers drawn: the triangles closing each one's side where it was cut from the next drawn apart --
            // laid round the finger's shape and in her finger's own colour, not across her texture (fingerFills.ts,
            // actor/fingerFillShape.ts)
            fingerFills?.dispose(); fingerFills = null;
            if (fingerSplit && !ownFingers && fingerSplit.filled > 0) try {
              fingerFills = createFingerFills(bm!, fillsMade?.tris ?? herTris, fingerSplit.filled, { fingers: fingerSplit, round: fillsMade?.round ?? null, toGeom: new THREE.Matrix3().setFromMatrix4(babyFrame.meshToRest).invert() });
              if (fingerFills) { bm!.userData.allIndices = fingerFills.herTris; bm!.geometry.setIndex(new THREE.BufferAttribute(Uint32Array.from(fingerFills.herTris), 1)); bm!.userData.coverMask = undefined; contactSet = null; }
            } catch (error) { console.error('[sarahlab] her fingers\' closing triangles could not be drawn apart', error); fingerFills?.dispose(); fingerFills = null; }
            // and, where her own fingers begin, her ring smoothed (ownFingers.ts): from rest metres into her geometry
            if (ownFingers?.seam.index.length) {
              const R = ownFingers.seam, toGeom = new THREE.Matrix3().setFromMatrix4(babyFrame.meshToRest).invert(), pos = new Float32Array(R.delta.length), v = new THREE.Vector3();
              for (let k = 0; k < R.index.length; k++) v.fromArray(R.delta, k * 3).applyMatrix3(toGeom).toArray(pos, k * 3);
              map.set(OWN_SEAM_FIELD, { index: R.index, pos, nrm: null });
            }
            sb.fields = { ...sb.fields, fields: map, last: '' };
            // and its split shaded along its middle (on her skin's own material)
            const rest = new Float32Array(sb.fields.basePos.length), v = new THREE.Vector3();
            for (let i = 0; i < rest.length / 3; i++) v.fromArray(sb.fields.basePos, i * 3).applyMatrix4(babyFrame.meshToRest).toArray(rest, i * 3);
            const c = birthAreaCentre(rest);
            if (c) {
              birthShadeU.centre.value.set(0, c.y, c.z); birthShadeU.rest.value.copy(babyFrame.meshToRest);
              for (const m of (Array.isArray(bm!.material) ? bm!.material : [bm!.material])) patchBirthShade(m, birthShadeU);
            }
            // and the area rebuilt finer, from her own skin, to be able to open (vulvaMesh.ts)
            vulva?.dispose();
            // (her legs' skin, and 1 cm in from it, kept out of the area: VULVA_OPEN.legMask; and the tops of her inner
            // thighs under her vulva, though her torso carries them: birthGap.ts)
            const bw = birthWeights as BirthWeights | null, under = birthGapUnderMask(sb.fields.basePos, sb.fields.baseNrm!, babyFrame.meshToRest), legSkin = bw ? (i: number) => under[i] === 1 || bw.legDistance(i) > -VULVA_OPEN.legMask : undefined;
            try { vulva = createVulvaPatch(bm!, sb.fields.basePos, babyFrame.meshToRest, measure?.joints.pelvis, measure ? [measure.joints.hipL, measure.joints.hipR, measure.joints.kneeL, measure.joints.kneeR] : [], legSkin); vulva?.setOpen(birthOpenPct / 100); vulva?.setBulge(birthBulgePct / 100); balloonWombKey = ''; layBalloonWomb(); } catch (error) { console.error('[sarahlab] her vulva could not be rebuilt; her own skin is drawn', error); vulva = null; }
            applyOpening();
            try { birthNormals = createBirthNormals(bm!, babyFrame.meshToRest, herTris, measure ? [measure.joints.hipL, measure.joints.hipR] : [], (i) => birthWeights?.maskOf(i) ?? 0, undefined /* the crease planes dented her belly: off (2026-10-31) */, measure?.joints.pelvis, undefined, measure ? [measure.joints.hipL, measure.joints.hipR] : []); } catch (error) { console.error('[sarahlab] her birth-pose normals could not be made', error); birthNormals = null; }
            // each knee: where her thigh's skin hands over to her shin's (both carry it), in her rest frame
            try {
              const jt = measure?.joints, ga = bm!.geometry, si2 = ga.getAttribute('skinIndex'), sw2 = ga.getAttribute('skinWeight'), centres: THREE.Vector3[] = [], pairs: [number, number][] = [];
              if (jt) for (const [hip, knee] of [[jt.hipL, jt.kneeL], [jt.hipR, jt.kneeR]] as const) {
                const c2 = new THREE.Vector3(), v2 = new THREE.Vector3(); let wsum = 0;
                for (let i = 0; i < si2.count; i++) {
                  let wh = 0, wk = 0; for (let k = 0; k < 4; k++) { const b2 = si2.getComponent(i, k), w2 = sw2.getComponent(i, k); if (b2 === hip) wh += w2; if (b2 === knee) wk += w2; }
                  const w = Math.min(wh, wk); if (w < 0.2) continue;
                  v2.fromArray(sb.fields.basePos, i * 3).applyMatrix4(babyFrame.meshToRest); c2.addScaledVector(v2, w); wsum += w;
                }
                if (wsum > 0) { centres.push(c2.divideScalar(wsum)); pairs.push([hip, knee]); }
              }
              birthKnees = centres.length ? createBirthNormals(bm!, babyFrame.meshToRest, herTris, [], undefined, undefined, undefined, { centres, near: KNEE_SMOOTH.near, far: KNEE_SMOOTH.far, passes: KNEE_SMOOTH.passes, lambda: KNEE_SMOOTH.lambda, bones: pairs, restore: kneeRestore }) : null;
            } catch (error) { console.error('[sarahlab] her knees could not be smoothed', error); birthKnees = null; }
            try { const jt = measure?.joints; hipTurn = jt ? createHipTurn(bm!, [jt.hipL, jt.hipR], [jt.hipL, jt.hipR, jt.kneeL, jt.kneeR], babyFrame.meshToRest) : null; } catch (error) { console.error('[sarahlab] her hips could not be turned', error); hipTurn = null; }
            try { const jt = measure?.joints; kneeTurn = jt ? createKneeTurn(bm!, [[jt.hipL, jt.kneeL], [jt.hipR, jt.kneeR]]) : null; } catch (error) { console.error('[sarahlab] her knees could not be turned', error); kneeTurn = null; }
            try { const jt = measure?.joints; birthContact = jt ? createBirthContact(bm!, babyFrame.meshToRest, herTris, [[jt.hipL, jt.kneeL], [jt.hipR, jt.kneeR]]) : null; } catch (error) { console.error('[sarahlab] her calves could not be pressed to her thighs', error); birthContact = null; }
            try { const jt = measure?.joints; birthRoom = jt ? createBirthRoom(bm!, babyFrame.meshToRest, herTris, jt.pelvis, jt.hipL, jt.hipR) : null; } catch (error) { console.error('[sarahlab] her birth-pose room could not be made', error); birthRoom = null; }
          }
        }
        if (babyShown) showBaby(true);
        settleMasses();
      }
      loaded = true;
      dress(outfit, true);
    }).catch(error => { console.error('[sarahlab] model/outfit preparation failed', error); failed = true; loaded = false; failLoad('Sarah', () => loadSarah()); refresh(); });
  }

  /** One frame of her: her walk, her pose, her springs, what is laid on her, and the cloth tee over her. */
  /** how far her torso leans from upright (degrees; back positive, forward negative): her pelvis to her chest, in the
   * world, signed by whether her chest is behind or in front of her hips as her front faces */
  function torsoTilt(): number {
    const sk = model && findSkinnedMesh(model);
    if (!sk || !measure) return 0;
    const b = sk.skeleton.bones, p = b[measure.joints.pelvis]?.getWorldPosition(new THREE.Vector3()), c = b[measure.joints.chest]?.getWorldPosition(new THREE.Vector3());
    if (!p || !c) return 0;
    const d = c.sub(p); const l = d.length();
    if (l < 1e-9) return 0;
    const deg = (Math.acos(Math.max(-1, Math.min(1, d.y / l))) * 180) / Math.PI;
    // (her front: her hips' frame as her baby is carried -- +z of her rest frame, carried by her spine)
    let front = new THREE.Vector3(0, 0, 1);
    if (babyFrame) front = front.transformDirection(new THREE.Matrix4().multiplyMatrices(babyFrame.bone.matrixWorld, babyFrame.matrix));
    const hf = Math.hypot(front.x, front.z), hd = Math.hypot(d.x, d.z);
    if (hf < 1e-6 || hd < 1e-6) return deg;
    return (d.x * front.x + d.z * front.z) / (hf * hd) > 0 ? -deg : deg;
  }
  /** her belly settling toward where her lean puts it, a whole settle at most every `seconds`; laid again in steps */
  function settleBelly(dt: number): void {
    const tilt = torsoTilt();
    if (pose === 'stand') uprightTilt = tilt;
    const want = !bellySettleOn ? 0 : Math.max(-1, Math.min(1, (tilt - uprightTilt) / BELLY_SETTLE.flatDeg)), rate = dt / BELLY_SETTLE.seconds;
    bellySettle += Math.max(-rate, Math.min(rate, want - bellySettle));
    bellySettleAt += dt;
    // (laid again when it has moved a step of her belly's size or come to rest, and not more often than ten times a second)
    const moved = Math.abs(bellySettle - bellySettleApplied) * BELLY_SETTLE.most * bump;
    if (moved > 1e-3 && bellySettleAt > 0.1 && (moved >= BELLY_SETTLE.step || bellySettle === want)) { bellySettleAt = 0; applyLook(); }
  }
  /** the angle between her two thighs (degrees): hip to knee each side, in the world */
  function thighSpread(): number {
    const sk = model && findSkinnedMesh(model);
    if (!sk || !measure) return 0;
    const b = sk.skeleton.bones, j = measure.joints, w = (i: number) => b[i].getWorldPosition(new THREE.Vector3());
    const l = w(j.kneeL).sub(w(j.hipL)), r = w(j.kneeR).sub(w(j.hipR));
    if (l.lengthSq() < 1e-12 || r.lengthSq() < 1e-12) return 0;
    return (l.angleTo(r) * 180) / Math.PI;
  }
  /**
   * HER POSE OPENS HER A LITTLE (Joshua, 2026-11-02: "the vagina naturally opens about 15% in a squat and 30% in a Recline,
   * because the skin pulls it open a little bit from standing to those poses, and closes naturally when the leg angles get
   * closer together"): from the angle between her thighs (measured: STAND 0, LEGS APART 36, SQUAT 85, RECLINE 159 degrees)
   * through the table --
   * eased toward it at `perSecond` of the way a second.
   */
  const NATURAL_OPEN = Object.freeze({ table: [[30, 0], [85, 0.15], [160, 0.3]] as const, perSecond: 0.5 });
  let naturalNow = 0;
  function naturalOpening(dt: number): void {
    if (!vulva) return;
    const a0 = thighSpread(), a = Number.isFinite(a0) ? a0 : 0, t = NATURAL_OPEN.table;
    let want = a <= t[0][0] ? t[0][1] : t[t.length - 1][1];
    for (let i = 1; i < t.length; i++) if (a <= t[i][0]) { const [a0, v0] = t[i - 1], [a1, v1] = t[i]; want = v0 + ((v1 - v0) * (a - a0)) / (a1 - a0); break; }
    naturalNow = Math.max(0, Math.min(1, naturalNow + Math.max(-NATURAL_OPEN.perSecond * dt, Math.min(NATURAL_OPEN.perSecond * dt, want - naturalNow))));
    // (her skeleton's opening: her doors are shut until they are pushed, so her skin round them is not held open by her pose)
    // (but through a birth it is, as v2's own: her baby's head is at her opening before it is pushed open)
    vulva.setNatural(vulva.skeletonOpening && birthClock === null ? 0 : naturalNow);
  }
  function advance(dt: number): void {
      seconds += dt;
      if (pose === 'walk') walked += WALK_SPEED * dt;
      if (sitMoving) { sitAmount = stepSit(sitAmount, pose === 'sit' ? 1 : 0, dt); if (sitAmount === (pose === 'sit' ? 1 : 0)) { sitMoving = false; applyLook(); } }
      else sitAmount = pose === 'sit' ? 1 : 0;
      // walking, her feet take her pose first (stepFeet); out of the walk, the next walk sets them down afresh
      if (onStage()) stepFeet(dt);
      else if (walkFeet) walkFeet.fresh = false;
      if (rig) rig.apply(currentTurns());
      // (her sneakers off in a birth position, on again out of it -- and her lift onto their soles with them; put on
      // before she had loaded, made now she has)
      if (sneakersOn && !sneakers && buildRig && model && sneakersFor !== model) setSneakers(true);
      if (sneakers && sneakers.visible !== sneakersShown()) { sneakers.visible = sneakersShown(); bonesBuilt = STALE_BUILD; layBuildBones(currentBuild()); }
      settleBelly(dt);
      naturalOpening(dt);
      keepBirthRoom();
      // VULVA DETAIL through clothes, as the fabric panel has it now (nothing is done unless it changed)
      vulva?.setDressedLips(fabric?.vulvaKeep() ?? DEFAULT_VULVA_KEEP);
      vulva?.sync();
      stepBirth(dt);
      // her hands to her baby once it lies on her, or back to her knees (BABY_HANDS.seconds either way); into her arms
      // and out of them (BABY_CRADLE.seconds) -- one thing at a time: her hands on it before she lifts it, and it laid back
      // on her before her hands go back to her knees (both at once, her hand went halfway to her knee from under it, her
      // arm out straight past her reach)
      // (SQUAT, P3b: once she has sat back with it on her chest; and while she is catching it, her hands are on it already)
      { const onHer = (pose === 'recline' || (pose === 'squat' && squatSit() >= 0.99)) && !!birthNow && bornStage(birthNow) && birthNow.onHer >= 1;
        if (pose === 'squat' && catchShareOf('L') > 0) babyHoldShare = 1;
        // (twins into her arms once both her hands are on them)
        const want = babyHold !== 'knees' && onHer ? 1 : 0, cradle = babyHold === 'cradle' && onHer && (babyCount === 1 || twinHandShare >= 0.99) ? 1 : 0;
        const handsTo = onHer && want === 0 && cradleShare > 0 ? 1 : want, cradleTo = cradle > 0 && babyHoldShare < 1 ? cradleShare : cradle;
        babyHoldShare += Math.max(-dt / BABY_HANDS.seconds, Math.min(dt / BABY_HANDS.seconds, handsTo - babyHoldShare));
        cradleShare += Math.max(-dt / BABY_CRADLE.seconds, Math.min(dt / BABY_CRADLE.seconds, cradleTo - cradleShare));
        // (twins: her right hand to the second once it lies on her too)
        const twinTo = want > 0 && babyCount >= 2 && (birthNow?.babies[1]?.onHer ?? 0) >= 1 ? 1 : 0;
        twinHandShare += Math.max(-dt / BABY_HANDS.seconds, Math.min(dt / BABY_HANDS.seconds, twinTo - twinHandShare)); }
      garmentRoom?.applyPose();
      place();
      // her pelvic organs follow her pelvis as soft bodies (v3, on her skeleton), her womb grown for HER WEEKS
      if (organs) {
        // (v2: her womb is her body's own -- none is grown here)
        const wk = organsGrowWomb && pregnant() ? herWeek(bump, babyCount, pregnancy) : null;
        organs.setPregnancy(wk, wk === null ? [] : Array.from({ length: babyCount }, () => babySize(wk, body.babyWeight, babyCount).g));
        // (v2: her doors open as her own skin's opening does -- BIRTH OPENING, her pose's, a birth's)
        if (!organsGrowWomb && vulva && skeletonOpening) {
          organs.setOpening(Math.max(vulva.drawnOpen, seatHeld)); const show = doorsSeen(); if (organs.doorsShown !== show) organs.doorsShown = show;
          // (her own skin carried down to her doors: the skin round them a sleeve round her canal, up into her)
          organs.skinSleeve = v2Seat.ring;
        }
        organs.update(dt);
        // (v2, her skeleton's opening: her own skin stretched down to her doors, over the sleeve round her canal as it now
        // stands -- none of it up to SEAT_SKIN_OPENS.from open, all of it by SEAT_SKIN_OPENS.to)
        if (vulva) {
          const seated = !organsGrowWomb && skeletonOpening && vulva.skeletonOpening && v2Seat.ring && v2Seat.skin, sl = seated ? organs.sleeve : null;
          const step = (a: number, b: number) => { const t = Math.min(1, Math.max(0, (organs!.opening - a) / (b - a))); return t * t * (3 - 2 * t); };
          vulva.setSeat(sl ? { points: sl.points, columns: sl.columns, version: sl.version, doors: sl.doors, share: step(SEAT_SKIN_OPENS.from, SEAT_SKIN_OPENS.to), tail: v2Torso.landmarks.coccyx } : null);
          // (and her skin's own opening, which her doors stand in while she is barely open: let shut as her skin goes down)
          if (seated) vulva.setSkeletonHole(1 - step(SEAT_SKIN_OPENS.from, SEAT_SKIN_OPENS.holeShut));
        }
        // (her belly's and her chest's organs only while they are seen: X-RAY)
        if (xrayPct > 0) { abdomen?.update(dt); thorax?.update(dt); }
        // (FOLD BACK's line follows the doors as they go, not only the slider)
        const fl = fields[SARAH_LAB_FIELD.foldBack], line = foldBackLine(foldBackPct, organs.doorAngles);
        if (fl && fl.textContent !== line) fl.textContent = line;
      }
      // her steps: each sneaker's heel coming down onto the floor is heard (on the tiles of a lab)
      if (sneakers && sneakers.visible) {
        for (const { foot, strength } of stepWatch.update(sneakers.heels().map((h) => h / M), dt)) { tileSteps.step(strength, foot); stepsHeard++; }
      } else stepWatch.reset();
      feelMotion(dt);
      // her face: her eyes, her blinks, her jaw
      faceFrame(dt);
      // (her hands on her knees, reclined: over her bones as everything above has laid them this frame)
      handsOnKnees();
      // (her contact points, drawn where her skin is now: P4)
      drawContacts();
      // a painted top's cleavage bridge is laid where her breasts are this frame
      if (fabric && model) { model.updateMatrixWorld(true); fabric.frame(); }
      // and every built strap laid on her skin as she is this frame
      if (builder && model) builder.frame();
      // seated (or still standing up), the fitted tee is worn; standing again, the cloth is laid on her afresh
      // -- with its sleeves, and not cropped: a tank has no sleeves to tear under her arms, and the fitted tee is far
      // longer than a crop, so both are worn seated as they are standing
      const seatedNow = seatedStandIn && sleeves && teeLengthParts(teeLength).crop === 0 && (pose === 'sit' || seated > 0.02);
      if (seatedNow !== clothSeated) {
        clothSeated = seatedNow;
        if (!seatedNow && cloth && clothOn) clothRestart = true;
        if (cloth && clothOn) { if (seatedNow) { setClothDetail(cloth.mesh.material as THREE.Material, null); setClothNeckline(cloth.mesh.material as THREE.Material, null); setClothTrim(cloth.mesh.material as THREE.Material, null); } applyLook(); refresh(); }
      }
      // and the cloth tee, moved over her as she is this frame (its cost on the stage)
      if (cloth && clothWorn() && cloth.mesh.visible && model?.visible && !clothLoading) {
        model.updateMatrixWorld(true);
        if (clothRefit) { refitCloth(cloth); clothRefit = false; }
        if (clothRestart) { cloth.restart(); clothRestart = false; }
        cloth.frame(dt);
        // her navel and nipples through it, at the editor's BREAST and NAVEL DETAIL; her navel softened under it to match
        const keep = clothKeep();
        cloth.keep = keep;
        setClothDetail(cloth.mesh.material as THREE.Material, cloth.detail(keep));
        // and its neckline, cut by the material along a smooth line
        setClothNeckline(cloth.mesh.material as THREE.Material, cloth.neckline());
        // and its crop's hem and tank's armholes, the same way
        setClothTrim(cloth.mesh.material as THREE.Material, cloth.trim());
        if (Math.abs(clothFlattenWanted() - clothFlattenLaid) > 1e-3) applyLook();
        if (fields.cloth) fields.cloth.textContent = clothLine(cloth.stats(), frameMs);
      }
      // the procedural tee a probe put on her (Stage 2b review): the room's tees stand aside while it is worn, it is laid
      // on her afresh when she changes pose (as the cloth tee is), and it collides with the stool when she sits
      if (garmentRoom && model?.visible) {
        if (cloth) cloth.mesh.visible = false;
        const lite = partMeshes.get('spandex-lite')?.[0];
        if (lite) lite.visible = false;
      }
      if (garmentRoom && model?.visible) {
        // a pose switch lays it on her afresh; STAND to SIT and back is a move, and it is worn all the way through it
        if (pose !== garmentPoseKey) { garmentPoseKey = pose; if (!sitMoving) garmentRoom.cloth.restart(); }
        if (garmentRoom.capsules.stool !== null || sitAmount > 0) garmentRoom.capsules = { ...garmentRoom.capsules, stool: sitAmount > 0 && stool.visible ? { x: stool.position.x, z: stool.position.z, radius: 0.21 * M, top: stool.scale.y } : null };
        model.updateMatrixWorld(true);
        // BREAST and NAVEL DETAIL, exactly as on the cloth tee: the domes under it, her details drawn through it, and
        // her navel softened under it to match
        const keep = clothKeep();
        garmentRoom.cloth.detailKeep = keep;
        // cut again for her shape when it changed, as the cloth tee is
        // (at most every GARMENT_REFIT_EVERY seconds while the slider is dragged: a cut is 40-100 ms of a phone's frame;
        // the last one, once she stops changing, always lands)
        garmentRefitAge += dt;
        if (garmentRefit && garmentRefitAge >= GARMENT_REFIT_EVERY) { garmentRoom.cloth.setRestShift(restShiftNow()); garmentRoom.cloth.refit(); garmentRefit = false; garmentRefitAge = 0; }
        // the outfit's tee is eased on as the review probes ease it: weightless a moment and pinned at the neckline where it
        // settled, then let hang and pinned again; and seated, her legs and the stool hold it
        if (garmentAuto) {
          // the review probes' own dressing, step for step (DRESS): weightless and pinned where it settled; her arms out a
          // little and down again, so the sleeves and underarms fall into place; pinned again where it hangs
          const was = garmentDressT; garmentDressT += dt;
          const D = DRESS, at = (k: number) => was < k && garmentDressT >= k;
          if (at(D.weightless)) { garmentRoom.cloth.settle(); garmentRoom.cloth.weightless = false; }
          if (garmentDressT < D.done) {
            const ss = (a: number, b: number) => { const t = Math.min(1, Math.max(0, (garmentDressT - a) / (b - a))); return t * t * (3 - 2 * t); };
            garmentRoom.pose.raise = D.raise * (ss(D.weightless, D.out) - ss(D.hold, D.down));
          } else if (was < D.done) garmentRoom.pose.raise = 0;
          if (at(D.done)) garmentRoom.cloth.settle();
          garmentRoom.capsules = { ...garmentRoom.capsules, arms: true, legs: sitAmount > 0 };
        }
        // a slow frame is taken in two halves: at a twentieth of a second a step, the cloth under her bust caught inside her
        // as the room opened at 73% belly (headless, a software renderer's frame), and halved it did not
        const pieces = dt > 1 / 40 ? 2 : 1;
        for (let k = 0; k < pieces; k++) garmentRoom.frame(dt / pieces);
        setClothDetail(garmentRoom.cloth.mesh.material as THREE.Material, garmentShade ? garmentRoom.cloth.detailShading(keep) : null);
        // the cloth tee's cuts stay off a material the garment shares with it, and the garment's own are on (a probe's
        // plain tee carries no cut, so its edge is never dropped)
        setClothNeckline(garmentRoom.cloth.mesh.material as THREE.Material, null); setClothTrim(garmentRoom.cloth.mesh.material as THREE.Material, null);
        if (garmentAuto) setCutEdge(garmentRoom.cloth.mesh.material as THREE.Material, teeCutDrawn);
        if (Math.abs(clothFlattenWanted() - clothFlattenLaid) > 1e-3) applyLook();
      }
      // the fitted light tee (the cloth off): her nipples drawn through it and its own navel settled onto its smooth
      // surface, at the editor's BREAST and NAVEL DETAIL; her navel softened under it to match
      const tee = fittedTee(), bodyMesh = tee ? skinned.find((m) => !!m.geometry.getAttribute('_cloth_cover')) : undefined;
      if (tee && bodyMesh && tee.visible && model?.visible) {
        if (!fitted || fitted.tee !== tee || fitted.body !== bodyMesh) {
          const bp = bodyMesh.geometry.getAttribute('position');
          fitted = { body: bodyMesh, tee, bodyPose: new SkinPose(bodyMesh), teePose: new SkinPose(tee), spots: new DetailSpots(SARAH_V2_DETAIL_POINTS), navel: new TeeNavel(SARAH_V2_LITE_TEE_NAVEL),
            surface: new NavelSurface(SARAH_V2_DETAIL_POINTS, { count: bp.count, at: (v, o) => { o[0] = bp.getX(v); o[1] = bp.getY(v); o[2] = bp.getZ(v); } }) };
        }
        model.updateMatrixWorld(true);
        fitted.bodyPose.refresh(); fitted.teePose.refresh();
        fitted.spots.measure(fitted.bodyPose);
        fitted.navel.measure(fitted.teePose, fitted.spots.navel);
        const keep = clothKeep();
        // her navel's own profile on it, as on the cloth shirts (navelSurface.ts), its own modelled navel settled away
        fitted.surface.follow(fitted.bodyPose, fitted.spots.navel, keep.navel);
        setClothDetail(tee.material as THREE.Material, fitted.spots.fitted(keep, fitted.navel, fitted.surface.profileFor()));
        fittedLaid = true;
        if (Math.abs(clothFlattenWanted() - clothFlattenLaid) > 1e-3) applyLook();
      } else if (fittedLaid && !clothWorn()) {
        const material = partMeshes.get('spandex-lite')?.[0]?.material;
        if (material) setClothDetail(material as THREE.Material, null);
        fittedLaid = false;
      }
  }

  return {
    name: SARAH_LAB_SCENE_ID,
    three,
    camera,
    // the one room that may be held upright on a phone (Joshua, 2026-10-20); the rotate prompt stands down for it
    portrait: true,

    async enter() {
      const size = ctx.renderer.size();
      placeCamera();
      buildHud();
      frame(size.width, size.height);
      loadSarah();
      // a bake of the built-in outfits' card pictures asks for it by address (scripts/bakeOutfitThumbs.mjs)
      if (new URLSearchParams(globalThis.location?.search ?? '').get('bake') === 'outfits') (globalThis as unknown as Record<string, unknown>).__sarahLabBakeOutfits = bakeOutfitPictures;
      // ...and a bake of her for the story player (scripts/sarahV2Recovery/story-sarah.mjs)
      if (new URLSearchParams(globalThis.location?.search ?? '').get('bake') === 'story') (globalThis as unknown as Record<string, unknown>).__sarahLabStory = { ready: storyReady, bake: bakeForStory };
      // ?probe=cloth: run the cloth tee N frames at a fixed step between pictures (a software renderer draws ~1 a second)
      // (a probe's look inside her hands: her mesh and the finger parts, read only by a probe that asks)
      if (new URLSearchParams(globalThis.location?.search ?? '').get('probe') === 'cloth') (globalThis as unknown as Record<string, unknown>).__sarahLabHands = () => ({ mesh: bodyOf()?.mesh ?? null, fingerSplit, fingerWeights, fingerFills, babyFrame, measure, THREE });
      if (new URLSearchParams(globalThis.location?.search ?? '').get('probe') === 'cloth') (globalThis as unknown as Record<string, unknown>).__sarahLabCloth = {
        // the three masses (softBody.ts): where each is, and what her skin shows of it (metres)
        bellySkin: (all?: boolean) => { const k = bellySkin(); if (k && babyAutoDepth && babySkinDepth?.length === k.length) { const u = depthUnit(); for (let i = 0; i < k.length; i++) k[i] -= babyAutoDepth * u * babySkinDepth[i]; } return k ? { n: k.length / 3, sample: Array.from(all ? k : k.slice(0, 30)), depth: all && babySkinDepth ? Array.from(babySkinDepth) : null, depthUnit: depthUnit(), zmax: Math.max(...Array.from(k).filter((_, i) => i % 3 === 2)), baby: all && babyPoints ? Array.from(babyPoints) : null, babyAll: all && babyAll ? Array.from(babyAll) : null, curl: babyCurl ? { centre: babyCurl.centre.toArray(), long: babyCurl.long.toArray(), back: babyCurl.back.toArray(), side: babyCurl.side.toArray(), size: babyCurl.size.toArray() } : null } : null; },
        // a probe's check: points of her body at the same place whose pushes differ (a seam opening)
        pushSeams: () => {
          const b = bodyOf(), j = b ? jiggleOfMesh(b.mesh) : null;
          if (!b || !j) return null;
          const pos = b.mesh.geometry.getAttribute('position') as THREE.BufferAttribute, seen = new Map<string, number>(), bad: number[][] = [];
          let worst = 0, pairs = 0;
          for (let i = 0; i < pos.count; i++) {
            const k = `${pos.getX(i).toFixed(5)},${pos.getY(i).toFixed(5)},${pos.getZ(i).toFixed(5)}`, o = seen.get(k);
            if (o === undefined) { seen.set(k, i); continue; }
            pairs++;
            const d = Math.hypot(j.push[i * 3] - j.push[o * 3], j.push[i * 3 + 1] - j.push[o * 3 + 1], j.push[i * 3 + 2] - j.push[o * 3 + 2]);
            worst = Math.max(worst, d);
            if (d > 1e-4 && bad.length < 8) bad.push([i, o, d, j.push[i * 3 + 2], j.push[o * 3 + 2], ((b.mesh.userData.pushAt as Uint32Array) ?? []).includes(i) ? 1 : 0, ((b.mesh.userData.pushAt as Uint32Array) ?? []).includes(o) ? 1 : 0]);
          }
          return { pairs, worst, bad };
        },
        // a probe's comparison: her belly with the baby's push taken off, or back
        birthArea: (on: boolean) => { birthAreaShown = on; applyLook(); return true; },
        // how much room her body leaves round the split: the opening's plane (tangent at the split's middle), and on a
        // grid across it (mm, x her left, t toward her front) how far her body stands out of that plane (mm), the most
        vulvaRoom: (step = 10, reach = 70) => {
          if (!vulva) return null;
          const b = bodyOf(); if (!b) return null;
          model?.updateMatrixWorld(true);
          const m = vulva.mesh, fl = vulva.bake.flat, v = new THREE.Vector3();
          const avg = (keep: (i: number) => boolean) => { const a = new THREE.Vector3(); let q = 0; for (let i = 0; i < vulva!.bake.count; i++) if (keep(i)) { m.getVertexPosition(i, v); m.localToWorld(v); a.add(v); q++; } return a.divideScalar(Math.max(1, q)); };
          const A = avg((i) => vulva!.bake.ring[i] === 0 && Math.abs(fl[i * 2 + 1]) < 0.004);
          const along = avg((i) => vulva!.bake.ring[i] === 0 && fl[i * 2 + 1] > 0.02).sub(avg((i) => vulva!.bake.ring[i] === 0 && fl[i * 2 + 1] < -0.02)).normalize();
          const across = avg((i) => Math.abs(fl[i * 2 + 1]) < 0.008 && fl[i * 2] > 0.01).sub(avg((i) => Math.abs(fl[i * 2 + 1]) < 0.008 && fl[i * 2] < -0.01));
          across.addScaledVector(along, -across.dot(along)).normalize();
          const n = along.clone().cross(across).normalize();
          const sk = findSkinnedMesh(model!); if (sk && measure) { const bones = sk.skeleton.bones, j = measure.joints, h = bones[j.hipL].getWorldPosition(new THREE.Vector3()).add(bones[j.hipR].getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5); if (n.dot(A.clone().sub(h)) < 0) n.negate(); }
          // the gap between her left and right (her body outside the rebuilt area) at each height out of the plane, at a few places along the split
          const cut = new Uint8Array(b.mesh.geometry.getAttribute('position').count), kept = new Uint8Array(cut.length);
          for (const i of vulva.bake.keep) kept[i] = 1;
          for (let k = 0; k < vulva.bake.src.length; k++) cut[vulva.bake.src[k]] = 1;
          const pts: number[] = [];
          for (let i = 0; i < cut.length; i++) {
            if (cut[i] && !kept[i]) continue;
            b.mesh.getVertexPosition(i, v); b.mesh.localToWorld(v); v.sub(A).divideScalar(M / 1000);
            pts.push(v.dot(across), v.dot(along), v.dot(n));
          }
          const gaps: string[] = ['  h \\ t |' + [-40, -20, 0, 20, 40].map((t) => String(t).padStart(12)).join('')];
          for (let h0 = 0; h0 <= 80; h0 += 10) {
            let line = String(h0).padStart(8) + ' |';
            for (const t0 of [-40, -20, 0, 20, 40]) {
              let left = Infinity, right = -Infinity;
              for (let q = 0; q < pts.length; q += 3) { const x = pts[q], t = pts[q + 1], h = pts[q + 2]; if (Math.abs(t - t0) > 4 || Math.abs(h - h0) > 5) continue; if (x > 0) left = Math.min(left, x); else right = Math.max(right, x); }
              line += (Number.isFinite(left) && Number.isFinite(right) ? `${Math.round(left - right)} (${Math.round(right)}..${Math.round(left)})` : 'open').padStart(12);
            }
            gaps.push(line);
          }
          const cells = Math.round(reach / step), N = 2 * cells + 1, high = Array.from({ length: N }, () => new Array<number>(N).fill(-Infinity));
          const pos = b.mesh.geometry.getAttribute('position');
          for (let i = 0; i < pos.count; i++) {
            b.mesh.getVertexPosition(i, v); b.mesh.localToWorld(v); v.sub(A).divideScalar(M / 1000);
            const x = v.dot(across), t = v.dot(along), h = v.dot(n);
            if (h < -40 || h > 200) continue;
            const ix = Math.round(x / step) + cells, it = Math.round(t / step) + cells;
            if (ix < 0 || it < 0 || ix >= N || it >= N) continue;
            high[it][ix] = Math.max(high[it][ix], h);
          }
          return { step, rows: high.map((r, k) => `${String((k - cells) * step).padStart(4)} | ` + r.map((h) => (h === -Infinity ? '   .' : String(Math.round(h)).padStart(4))).join('')).reverse(), cols: '  t  | ' + Array.from({ length: N }, (_, k) => String((k - cells) * step).padStart(4)).join(''), gaps };
        },
        // her body's draw emptied (the rebuilt area and its tube left on their own), or back
        vulvaSolo: (on: boolean) => { const b = bodyOf(); if (!b) return false; b.mesh.visible = !on; if (vulva) { vulva.solo = on; vulva.sync(); } const m = vulva?.mesh; let root: THREE.Object3D | null = m ?? null; while (root?.parent) root = root.parent; return { patch: !!m, visible: m?.visible, parent: m?.parent?.name ?? m?.parent?.type, inScene: root?.type, drawRange: [m?.geometry.drawRange.start, m?.geometry.drawRange.count], count: m?.geometry.getAttribute('position').count, idx: m?.geometry.index?.count, bodyIsPatchGeom: m?.geometry === b.mesh.geometry }; },
        wombOutside: () => vulva?.wombOutside() ?? null,
        vulvaNoTube: (on: boolean) => { if (vulva) { vulva.noTube = on; vulva.sync(); } return true; },
        vulvaBacking: (on: boolean, trim = true) => { if (vulva) { vulva.backing = on; if (vulva.trim !== trim) { vulva.trim = trim; vulva.relayOut(); } vulva.sync(); } return true; },
        vulvaPatchDrawn: (on: boolean) => { if (vulva) vulva.mesh.geometry.setDrawRange(0, on ? Infinity : 0); return true; },
        // aim straight at her split: from its own facing, at a distance (and turned a little either way)
        vulvaAim: (distance: number, yawOff = 0, pitchOff = 0) => {
          if (!vulva) return null; model?.updateMatrixWorld(true);
          const ud = vulva.mesh.userData as { face?: ReturnType<VulvaPatch['facing']> };
          if (!ud.face || vulva.open === 0) ud.face = vulva.facing();
          const f = ud.face; orbit.yaw = f.yaw + yawOff; orbit.pitch = f.pitch + pitchOff; orbit.distance = distance; orbit.target.copy(f.at); turning = false;
          return { yaw: +f.yaw.toFixed(3), pitch: +f.pitch.toFixed(3), dbg: vulva.debug() };
        },
        vulvaStats: () => {
          const b = bodyOf(); if (!vulva || !b) return null;
          const ud = vulva.mesh.userData as { drawn?: number }; if (ud.drawn === undefined) { ud.drawn = 0; vulva.mesh.onBeforeRender = () => { ud.drawn!++; }; }
          const pa = vulva.mesh.geometry.getAttribute('position') as THREE.BufferAttribute, arr = pa.array as Float32Array;
          let nan = 0; for (const x of arr) if (!Number.isFinite(x)) nan++;
          const v = new THREE.Vector3(), w = new THREE.Vector3(), p0 = 100, src = vulva.bake.src[p0 * 3];
          vulva.mesh.getVertexPosition(p0, v); vulva.mesh.localToWorld(v); b.mesh.getVertexPosition(src, w); b.mesh.localToWorld(w);
          return { nan, n: pa.count, local0: [arr[p0 * 3], arr[p0 * 3 + 1], arr[p0 * 3 + 2]], bodyLocal: [b.mesh.geometry.getAttribute('position').getX(src), b.mesh.geometry.getAttribute('position').getY(src), b.mesh.geometry.getAttribute('position').getZ(src)], world0: v.toArray(), bodyWorld: w.toArray(), meshVisible: vulva.mesh.visible, layers: vulva.mesh.layers.mask, bodyLayers: b.mesh.layers.mask, matVisible: (vulva.mesh.material as THREE.Material).visible, renderOrder: [vulva.mesh.renderOrder, b.mesh.renderOrder], bodyParentIsScene: b.mesh.parent === vulva.mesh.parent, drawn: ud.drawn, calls: ctx.renderer.gl.info.render.calls, solo: vulva.solo, parentVisible: vulva.mesh.parent?.visible, dbg: vulva.debug() };
        },
        // a wireframe look (Joshua, 2026-10-30: "how about doing a wireframe view of the body and it"): her body grey, the
        // rebuilt area blue, the tube red, nothing solid
        wireView: (on: boolean) => {
          const b = bodyOf(); if (!b || !vulva) return false;
          const keep = (b.mesh.userData.wireKeep ??= { body: b.mesh.material, patch: vulva.mesh.material, tube: vulva.tube.material, sheet: vulva.sheet.material }) as { sheet: THREE.Material; body: THREE.Material; patch: THREE.Material; tube: THREE.Material };
          const wire = (hex: number, opacity: number) => new THREE.MeshBasicMaterial({ color: hex, wireframe: true, transparent: opacity < 1, opacity });
          if (on) { b.mesh.material = wire(0x8a8f99, 0.35); vulva.mesh.material = wire(0x1d5bff, 1); vulva.tube.material = wire(0xe0284a, 1); vulva.sheet.material = wire(0x10b040, 1); }
          else { b.mesh.material = keep.body; vulva.mesh.material = keep.patch; vulva.tube.material = keep.tube; vulva.sheet.material = keep.sheet; delete b.mesh.userData.wireKeep; }
          return true;
        },
        vulvaAxes: () => {
          if (!vulva || !model || !measure) return null; model.updateMatrixWorld(true);
          const sk = findSkinnedMesh(model)!, bones = sk.skeleton.bones, j = measure.joints;
          const hip = bones[j.hipL].getWorldPosition(new THREE.Vector3()).add(bones[j.hipR].getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5);
          const knee = bones[j.kneeL].getWorldPosition(new THREE.Vector3()).add(bones[j.kneeR].getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5);
          const head = bones[j.head].getWorldPosition(new THREE.Vector3());
          return { ...vulva.worldAxes(), toKnees: knee.sub(hip).normalize().toArray().map((x) => +x.toFixed(3)), toHead: head.sub(hip).normalize().toArray().map((x) => +x.toFixed(3)) };
        },
        birthMask: (share: number | null) => { birthMaskOverride = share; applyLook(); return { touched: birthWeights?.touched ?? null, debug: birthWeights?.debug }; },
        // (debug) her skin as drawn, painted by which bones carry it: red her left thigh's, blue her right's, white the
        // rest; null takes it away
        // (debug) her skin as drawn painted by how sharply it bends there: white flat, yellow 15 degrees, red 40 or more
        bendPaint: (on: boolean) => {
          const b = bodyOf(); if (!b || !model) return null;
          const old = (model.userData.weightPaint as THREE.Mesh | undefined); if (old) { old.removeFromParent(); old.geometry.dispose(); (old.material as THREE.Material).dispose(); model.userData.weightPaint = undefined; }
          b.mesh.visible = true; if (!on) return false;
          model.updateMatrixWorld(true); b.mesh.skeleton.update();
          const g0 = b.mesh.geometry, n = g0.getAttribute('position').count, P2 = new Float32Array(n * 3), C2 = new Float32Array(n * 3).fill(1), v = new THREE.Vector3();
          for (let i = 0; i < n; i++) { b.mesh.getVertexPosition(i, v); v.toArray(P2, i * 3); }
          const idx = (b.mesh.userData.allIndices as ArrayLike<number> | undefined) ?? g0.index!.array;
          const key = new Int32Array(n), km = new Map<string, number>();
          for (let i = 0; i < n; i++) { const k = `${Math.round(g0.getAttribute('position').getX(i) * 1e4)},${Math.round(g0.getAttribute('position').getY(i) * 1e4)},${Math.round(g0.getAttribute('position').getZ(i) * 1e4)}`; let q = km.get(k); if (q === undefined) { q = km.size; km.set(k, q); } key[i] = q; }
          const fn: number[] = [], et = new Map<string, number>(), worst = new Float32Array(km.size);
          const A = new THREE.Vector3(), B2 = new THREE.Vector3(), C3 = new THREE.Vector3();
          for (let t = 0; t + 2 < idx.length; t += 3) {
            A.fromArray(P2, idx[t] * 3); B2.fromArray(P2, idx[t + 1] * 3); C3.fromArray(P2, idx[t + 2] * 3);
            const nn = B2.sub(A).cross(C3.sub(A)); const l = nn.length() || 1; fn.push(nn.x / l, nn.y / l, nn.z / l);
            const f = t / 3;
            for (let q = 0; q < 3; q++) {
              const a0 = key[idx[t + q]], b0 = key[idx[t + (q + 1) % 3]], e = a0 < b0 ? `${a0},${b0}` : `${b0},${a0}`, o2 = et.get(e);
              if (o2 === undefined) et.set(e, f); else {
                const dot = fn[o2 * 3] * fn[f * 3] + fn[o2 * 3 + 1] * fn[f * 3 + 1] + fn[o2 * 3 + 2] * fn[f * 3 + 2], ang = Math.acos(Math.max(-1, Math.min(1, Math.abs(dot)))) * 180 / Math.PI;
                worst[a0] = Math.max(worst[a0], ang); worst[b0] = Math.max(worst[b0], ang);
              }
            }
          }
          for (let i = 0; i < n; i++) { const a = worst[key[i]]; const t1 = Math.min(1, a / 15), t2 = Math.min(1, Math.max(0, (a - 15) / 25)); C2[i * 3] = 1; C2[i * 3 + 1] = 1 - 0.1 * t1 - 0.9 * t2; C2[i * 3 + 2] = 1 - t1; }
          const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.BufferAttribute(P2, 3)); g2.setAttribute('color', new THREE.BufferAttribute(C2, 3));
          g2.setIndex(new THREE.BufferAttribute(Uint32Array.from(idx), 1)); g2.computeVertexNormals();
          const m2 = new THREE.Mesh(g2, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
          m2.matrixAutoUpdate = false; m2.matrix.copy(b.mesh.matrixWorld); m2.matrixWorldNeedsUpdate = true; m2.frustumCulled = false;
          three.add(m2); model.userData.weightPaint = m2; b.mesh.visible = false; if (vulva) vulva.mesh.visible = false;
          return true;
        },
        weightPaint: (on: boolean) => {
          const b = bodyOf(); if (!b || !model || !measure) return null;
          const old = (model.userData.weightPaint as THREE.Mesh | undefined); if (old) { old.removeFromParent(); old.geometry.dispose(); (old.material as THREE.Material).dispose(); model.userData.weightPaint = undefined; }
          b.mesh.visible = true;
          if (!on) return false;
          model.updateMatrixWorld(true); b.mesh.skeleton.update();
          const g0 = b.mesh.geometry, n = g0.getAttribute('position').count, P2 = new Float32Array(n * 3), C2 = new Float32Array(n * 3), v = new THREE.Vector3();
          const si = g0.getAttribute('skinIndex'), sw = g0.getAttribute('skinWeight'), j = measure.joints;
          const thighL = [j.hipL, j.kneeL], thighR = [j.hipR, j.kneeR];
          for (let i = 0; i < n; i++) {
            b.mesh.getVertexPosition(i, v); v.toArray(P2, i * 3);
            let l = 0, r = 0;
            for (let c = 0; c < 4; c++) { const bi = si.getComponent(i, c), w = sw.getComponent(i, c); if (thighL.includes(bi)) l += w; if (thighR.includes(bi)) r += w; }
            C2[i * 3] = 1 - r; C2[i * 3 + 1] = 1 - l - r; C2[i * 3 + 2] = 1 - l;
          }
          const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.BufferAttribute(P2, 3)); g2.setAttribute('color', new THREE.BufferAttribute(C2, 3));
          g2.setIndex(new THREE.BufferAttribute(Uint32Array.from((b.mesh.userData.allIndices as ArrayLike<number> | undefined) ?? g0.index!.array), 1)); g2.computeVertexNormals();
          const m2 = new THREE.Mesh(g2, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
          m2.matrixAutoUpdate = false; m2.matrix.copy(b.mesh.matrixWorld); m2.matrixWorldNeedsUpdate = true; m2.frustumCulled = false;
          three.add(m2);
          model.userData.weightPaint = m2; b.mesh.visible = false; if (vulva) vulva.mesh.visible = false;
          return true;
        },
        birthHalf: (on: boolean) => { halfByPose = false; birthNormals?.setHalf(on); birthRoomFor = ''; applyLook(); return birthNormals?.halfBend ?? null; },
        birthSeam: (on: boolean) => { birthNormals?.setSeam(on); birthRoomFor = ''; applyLook(); return { first: birthNormals?.seamFirst, left: birthNormals?.seamLeft }; },
        // which bones carry the skin round each hip's front crease (a probe reads it to see what the hips' fixes reach)
        hipSkin: () => {
          const b = bodyOf(); if (!b || !measure || !babyFrame) return null;
          const g = b.mesh.geometry, si = g.getAttribute('skinIndex'), sw = g.getAttribute('skinWeight'), bones = b.mesh.skeleton.bones, jt = measure.joints, toRest = babyFrame.meshToRest;
          const basePos = shaped.find((x) => x.mesh === b.mesh)?.fields.basePos; if (!basePos) return null;
          const jointAt = (bi: number) => new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().copy(b.mesh.bindMatrix).invert().multiply(new THREE.Matrix4().copy(b.mesh.skeleton.boneInverses[bi]).invert())).applyMatrix4(toRest);
          const out: Record<string, unknown> = { pelvis: bones[jt.pelvis]?.name, hipL: bones[jt.hipL]?.name, hipR: bones[jt.hipR]?.name, kneeL: bones[jt.kneeL]?.name, spine: bones[jt.chest]?.name };
          for (const [side, hip] of [['L', jt.hipL], ['R', jt.hipR]] as const) {
            const j = jointAt(hip), v = new THREE.Vector3(), sig = new Map<string, { n: number; w: Record<string, number>; x: number; y: number; z: number }>();
            for (let i = 0; i < si.count; i++) {
              let wh = 0; for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === hip) wh += sw.getComponent(i, k);
              if (wh < 0.05 || wh > 0.95) continue;
              v.fromArray(basePos, i * 3).applyMatrix4(toRest);
              if (v.z < j.z || Math.abs(v.y - j.y) > 0.15 || Math.abs(v.x - j.x) > 0.12) continue;
              const names: string[] = []; for (let k = 0; k < 4; k++) if (sw.getComponent(i, k) > 0.02) names.push(bones[si.getComponent(i, k)]?.name ?? '?');
              const key = names.sort().join('+'); const e = sig.get(key) ?? { n: 0, w: {}, x: 0, y: 0, z: 0 }; e.n++; e.x += v.x; e.y += v.y; e.z += v.z;
              for (let k = 0; k < 4; k++) { const nm = bones[si.getComponent(i, k)]?.name ?? '?', w = sw.getComponent(i, k); if (w > 0.02) e.w[nm] = (e.w[nm] ?? 0) + w; }
              sig.set(key, e);
            }
            out[side] = { joint: j.toArray().map((x) => +x.toFixed(3)), sets: [...sig].sort((a, c) => c[1].n - a[1].n).slice(0, 6).map(([k, e]) => ({ bones: k, n: e.n, at: [e.x / e.n, e.y / e.n, e.z / e.n].map((x) => +x.toFixed(3)), w: Object.fromEntries(Object.entries(e.w).map(([nm, w]) => [nm, +(w / e.n).toFixed(2)])) })) };
          }
          return out;
        },
        // her skin drawn as shape and light only (its colour and normal maps taken off), to tell a fold from a stretched texture
        skinPlain: (on: boolean) => { const b = bodyOf(); if (!b) return false; for (const m of (Array.isArray(b.mesh.material) ? b.mesh.material : [b.mesh.material]) as THREE.MeshStandardMaterial[]) { const ud = m.userData as { plain?: { map: THREE.Texture | null; normalMap: THREE.Texture | null } }; if (on && !ud.plain) { ud.plain = { map: m.map, normalMap: m.normalMap }; m.map = null; m.normalMap = null; m.needsUpdate = true; } else if (!on && ud.plain) { m.map = ud.plain.map; m.normalMap = ud.plain.normalMap; delete ud.plain; m.needsUpdate = true; } } return true; },
        birthKnees: (on: boolean) => { birthKneesOn = on; birthRoomFor = ''; applyLook(); return birthKnees?.watched ?? null; },
        squatPull: (v: number) => { squatPull = v; birthRoomFor = ''; applyLook(); return v; },
        squatBack: (v: number) => { squatBack = v; applyLook(); birthRoomFor = ''; return v; },
        birthFill: (squat: number, recline: number) => { birthFillSquat = squat; birthFillRecline = recline; birthRoomFor = ''; applyLook(); return true; },
        legSpread: () => ({ deg: +thighSpread().toFixed(1), natural: +naturalNow.toFixed(3), drawn: vulva ? +vulva.drawnOpen.toFixed(3) : null }),
        bellySettle: (on?: boolean) => { if (on !== undefined) { bellySettleOn = on; if (!on) { bellySettle = 0; applyLook(); } } return { on: bellySettleOn, settle: +bellySettle.toFixed(3), tiltDeg: +torsoTilt().toFixed(1), uprightDeg: +uprightTilt.toFixed(1), drawn: +shownBump().toFixed(1), bump }; },
        birthGap: (on: boolean) => { birthGapOn = on; applyLook(); return { on, ...birthGapInfo }; },
        birthSeat: (on: boolean, squat?: number) => { birthSeatOn = on; if (typeof squat === 'number') birthSeatSquat = squat; applyLook(); return on; },
        birthTweak: (t: Partial<BirthSpec> | null) => { birthTweak = t; applyLook(); return true; },
        birthRoom: (on: boolean) => { birthRoomOn = on; birthRoomFor = ''; applyLook(); return { watched: birthRoom?.watched ?? null, largestMm: birthRoom ? +(birthRoom.largest * 1000).toFixed(1) : null, partsMm: birthRoom ? Object.fromEntries(Object.entries(birthRoom.parts).map(([k2, v2]) => [k2, +(v2 * 1000).toFixed(1)])) : null }; },
        // which of her points have come to her middle as posed (pelvis frame |x| < 6 mm) that stood well off it, and where they stood
        // her seams as drawn: points that are one point in her model (several copies for the texture) and how far apart
        // her skinning and shape fields have pulled the copies (world units), the worst and how many past 0.5 / 2 mm
        seamGaps: (fresh = false) => {
          const b = bodyOf(); if (!b || !model) return null;
          model.updateMatrixWorld(true); b.mesh.skeleton.update();
          const sb = shaped.find((x) => x.mesh === b.mesh), base = sb?.fields.basePos; if (!base) return null;
          const n = Math.floor(base.length / 3), groups = new Map<string, number[]>();
          for (let i = 0; i < n; i++) { const k = `${Math.round(base[i * 3] * 1e6)},${Math.round(base[i * 3 + 1] * 1e6)},${Math.round(base[i * 3 + 2] * 1e6)}`; (groups.get(k) ?? groups.set(k, []).get(k)!).push(i); }
          const a = new THREE.Vector3(), c = new THREE.Vector3(), world = (i: number, o: THREE.Vector3) => b.mesh.localToWorld(b.mesh.getVertexPosition(i, o));
          let worst = 0, over05 = 0, over2 = 0, at: number[] = [];
          for (const g2 of groups.values()) {
            if (g2.length < 2) continue;
            world(g2[0], a);
            for (let q = 1; q < g2.length; q++) {
              const d = world(g2[q], c).distanceTo(a);
              if (d > 0.05) over05++; if (d > 0.2) over2++;
              if (d > worst) { worst = d; at = [g2[0], g2[q]]; }
            }
          }
          const oe = birthNormals?.openEdges ?? [], rest = babyFrame?.meshToRest, pa = b.mesh.geometry.getAttribute('position'), v = new THREE.Vector3();
          const openAt = rest ? Array.from({ length: Math.min(12, oe.length / 2) }, (_, q) => v.set(pa.getX(oe[q * 2]), pa.getY(oe[q * 2]), pa.getZ(oe[q * 2])).applyMatrix4(rest).toArray().map((x) => +x.toFixed(3))) : [];
          // her triangles near her groin turned to face in: drawn (with every field) against how her skinning alone turns them
          let flipped = 0, near = 0; const flipAt: number[][] = [];
          if (rest) {
            const all = (b.mesh.userData.allIndices as ArrayLike<number> | undefined) ?? b.mesh.geometry.index?.array ?? [];
            const P0 = new THREE.Vector3(), P1 = new THREE.Vector3(), P2 = new THREE.Vector3(), Q0 = new THREE.Vector3(), Q1 = new THREE.Vector3(), Q2 = new THREE.Vector3(), r0 = new THREE.Vector3();
            const skinOnly = (i: number, o: THREE.Vector3) => b.mesh.applyBoneTransform(i, o.fromArray(base, i * 3));
            for (let t = 0; t + 2 < all.length; t += 3) {
              const i0 = all[t], i1 = all[t + 1], i2 = all[t + 2];
              r0.fromArray(base, i0 * 3).applyMatrix4(rest);
              if (Math.abs(r0.x) > 0.25 || r0.y < 0.55 || r0.y > 0.95) continue;
              near++;
              b.mesh.getVertexPosition(i0, P0); b.mesh.getVertexPosition(i1, P1); b.mesh.getVertexPosition(i2, P2);
              skinOnly(i0, Q0); skinOnly(i1, Q1); skinOnly(i2, Q2);
              const nd = P1.sub(P0).cross(P2.sub(P0)), ns = Q1.sub(Q0).cross(Q2.sub(Q0));
              if (nd.lengthSq() < 1e-14 || ns.lengthSq() < 1e-14) continue;
              if (nd.dot(ns) < 0) { flipped++; if (flipAt.length < 10) flipAt.push(r0.toArray().map((x) => +x.toFixed(3))); }
            }
          }
          // sharp folds as drawn: triangles sharing an edge, facing more than 120 degrees apart
          let folds = 0; const foldAt: number[][] = [], foldZ = new Array(10).fill(0);
          if (rest) {
            const all = (b.mesh.userData.allIndices as ArrayLike<number> | undefined) ?? b.mesh.geometry.index?.array ?? [];
            const keyOf = new Map<string, number>(), kk = (i: number) => { const s2 = `${Math.round(base[i * 3] * 1e4)},${Math.round(base[i * 3 + 1] * 1e4)},${Math.round(base[i * 3 + 2] * 1e4)}`; let q = keyOf.get(s2); if (q === undefined) { q = keyOf.size; keyOf.set(s2, q); } return q; };
            const edgeTri = new Map<string, number>(), fn = new Map<number, THREE.Vector3>(), A = new THREE.Vector3(), B2 = new THREE.Vector3(), C2 = new THREE.Vector3(), r1 = new THREE.Vector3();
            for (let t = 0; t + 2 < all.length; t += 3) {
              r1.fromArray(base, all[t] * 3).applyMatrix4(rest);
              if (Math.abs(r1.x) > 0.25 || r1.y < 0.55 || r1.y > 0.95) continue;
              b.mesh.getVertexPosition(all[t], A); b.mesh.getVertexPosition(all[t + 1], B2); b.mesh.getVertexPosition(all[t + 2], C2);
              const nn = B2.sub(A).cross(C2.sub(A)); if (nn.lengthSq() < 1e-16) continue; fn.set(t, nn.normalize().clone());
              for (let q = 0; q < 3; q++) {
                const a0 = kk(all[t + q]), b0 = kk(all[t + (q + 1) % 3]), e2 = a0 < b0 ? `${a0},${b0}` : `${b0},${a0}`, o = edgeTri.get(e2);
                if (o === undefined) edgeTri.set(e2, t); else { const no = fn.get(o); if (no && no.dot(fn.get(t)!) < -0.5) { folds++; foldZ[Math.max(0, Math.min(9, Math.floor((r1.z + 0.3) / 0.05)))]++; if (foldAt.length < 40 && r1.z < -0.05) foldAt.push(r1.toArray().map((x) => +x.toFixed(3))); } }
              }
            }
          }
          // drawn against meant (her mesh's own space, as getVertexPosition gives it); `fresh` worked out again first
          if (fresh) { birthRoomFor = ''; keepBirthRoom(); model.updateMatrixWorld(true); b.mesh.skeleton.update(); }
          let missWorst = 0, missOver1mm = 0, missAt = -1;
          { const ex = birthNormals?.expected ?? [], o2 = new THREE.Vector3();
            for (let q = 0; q + 3 < ex.length; q += 4) { b.mesh.getVertexPosition(ex[q], o2); const d = Math.hypot(o2.x - ex[q + 1], o2.y - ex[q + 2], o2.z - ex[q + 3]); if (d > missWorst) { missWorst = d; missAt = ex[q]; } if (d > 0.0011) missOver1mm++; } }
          const missRest = rest && missAt >= 0 ? new THREE.Vector3().fromArray(base, missAt * 3).applyMatrix4(rest).toArray().map((x) => +x.toFixed(3)) : null;
          return { missRest, kneeWatched: birthKnees?.watched ?? null, missWorst: +missWorst.toFixed(5), missOver1mm, meant: (birthNormals?.expected.length ?? 0) / 4, folds, foldZ, foldAt, unironed: birthNormals?.folded, blow: birthNormals?.blow, worst: +worst.toFixed(3), over05, over2, at, openEdges: oe.length / 2, openAt, near, flipped };
        },
        midlineCrossers: () => {
          const b = bodyOf(); if (!b || !babyFrame || !measure || !model) return null;
          model.updateMatrixWorld(true);
          const m = b.mesh, sk = m.skeleton, pel = measure.joints.pelvis, rest = babyFrame.meshToRest;
          const Spi = new THREE.Matrix4().multiplyMatrices(m.bindMatrixInverse, new THREE.Matrix4().multiplyMatrices(sk.bones[pel].matrixWorld, sk.boneInverses[pel])).multiply(m.bindMatrix).invert();
          const v = new THREE.Vector3(), r = new THREE.Vector3(), out: Record<string, number> = {};
          const pa = m.geometry.getAttribute('position');
          for (let i = 0; i < pa.count; i++) {
            r.set(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(rest);
            if (Math.abs(r.x) < 0.02) continue;
            m.getVertexPosition(i, v); v.applyMatrix4(m.bindMatrix).applyMatrix4(m.bindMatrixInverse); // already in mesh space
            v.applyMatrix4(Spi).applyMatrix4(rest);
            if (Math.abs(v.x) > 0.006) continue;
            const k = `y${Math.round(r.y * 20) / 20}|z${Math.round(r.z * 20) / 20}|x${Math.round(Math.abs(r.x) * 50) / 50}`;
            out[k] = (out[k] ?? 0) + 1;
          }
          return Object.entries(out).sort((a2, b2) => b2[1] - a2[1]).slice(0, 25);
        },
        // what of her stands between the camera and her vulva (within 2.5 cm of the line from the camera to its middle)
        occluders: () => {
          const b = bodyOf(); if (!b || !vulva || !babyFrame || !model) return null;
          model.updateMatrixWorld(true);
          const f = vulva.facing(), cam = camera.position.clone(), dir = f.at.clone().sub(cam), len = dir.length(); dir.normalize();
          const v = new THREE.Vector3(), r = new THREE.Vector3(), out: Record<string, number> = {}, m = b.mesh, pa = m.geometry.getAttribute('position'), si = m.geometry.getAttribute('skinIndex'), sw = m.geometry.getAttribute('skinWeight');
          let count = 0;
          for (let i = 0; i < pa.count; i++) {
            m.getVertexPosition(i, v); m.localToWorld(v);
            const t = v.clone().sub(cam).dot(dir);
            if (t < 0.05 * M || t > len - 0.015 * M) continue;
            if (v.clone().sub(cam).addScaledVector(dir, -t).length() > 0.025 * M) continue;
            r.set(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(babyFrame.meshToRest);
            let bone = -1, bw = -1; for (let c = 0; c < 4; c++) if (sw.getComponent(i, c) > bw) { bw = sw.getComponent(i, c); bone = si.getComponent(i, c); }
            const k = `${m.skeleton.bones[bone]?.name}|y${r.y.toFixed(2)}|z${r.z.toFixed(2)}|x${Math.abs(r.x).toFixed(2)}`;
            out[k] = (out[k] ?? 0) + 1; count++;
          }
          const jn = measure ? Object.fromEntries(Object.entries(measure.joints).map(([k2, i2]) => [k2, `${i2}:${m.skeleton.bones[i2 as number]?.name}`])) : null;
          return { joints: jn, count, cam: cam.divideScalar(M).toArray().map((x) => +x.toFixed(3)), top: Object.entries(out).sort((a2, b2) => b2[1] - a2[1]).slice(0, 20) };
        },
        birthNormals: (on: boolean) => { birthNormalsOn = on; birthRoomFor = ''; applyLook(); return { watched: birthNormals?.watched ?? null, pierced: birthNormals?.pierced ?? null }; },
        vulvaOpen: (o: number) => { if (!vulva) return null; vulva.setOpen(o); return vulva.open; },
        squatSit: () => ({ now: +squatSit().toFixed(3), placed: squatSitAt }),
        plantOff: (off: boolean) => { plantOff = off; birthPlaced = null; return true; },
        // (P4: the touch bench -- `mode` off or cup -- and how each finger closed)
        elbowAt: () => { const sk = bodyOf()?.mesh; if (!sk || !measure) return null; sk.updateMatrixWorld(true); return sk.skeleton.bones[measure.joints.elbowR].getWorldPosition(new THREE.Vector3()).divideScalar(M).toArray().map((x) => +x.toFixed(3)); },
        touchWhere: () => { const c = contactsOf(); if (!c || !measure) return null; const sk = c.mesh, cm = (v: THREE.Vector3) => v.clone().divideScalar(M / 100).toArray().map((x) => +x.toFixed(1)), v = new THREE.Vector3(); sk.updateMatrixWorld(true);
          const site = (k: string) => { const p = c.set.points.find((q) => `${q.side}.${q.site}` === k); if (!p) return null; c.surface.evaluate(p, v); return cm(sk.localToWorld(v)); };
          const hj = handJointsOf(rig!.bind)[1];
          return { asked: touchAsked ? { tip: cm(touchAsked.tip), centre: cm(touchAsked.centre), along: touchAsked.along.toArray().map((x) => +x.toFixed(2)), face: touchAsked.face.toArray().map((x) => +x.toFixed(2)) } : null, wristR: cm(sk.skeleton.bones[measure.joints.wristR].getWorldPosition(v)), tipBone: hj ? cm(sk.skeleton.bones[hj.tip].getWorldPosition(v)) : null, palm: site('R.palm'), middleTip: site('R.middleTip'), indexPad: site('R.indexPad'), thumbPad: site('R.thumbPad'), tips: ['thumb', 'index', 'middle', 'ring', 'little'].map((f) => site(`R.${f}Tip`)), heel: site('R.palmHeel'), left: { wrist: cm(sk.skeleton.bones[measure.joints.wristL].getWorldPosition(v)), palm: site('L.palm'), heel: site('L.palmHeel'), tips: ['thumb', 'index', 'middle', 'ring', 'little'].map((f) => site(`L.${f}Tip`)) }, missing: c.set.missing }; },
        // (a probe: where on the screen (CSS pixels of the canvas) points of the world (metres) are drawn now, and the camera's place)
        project: (pts: number[][]) => { placeCamera(); camera.updateMatrixWorld(true); const el = ctx.renderer.gl.domElement, r = el.getBoundingClientRect();
          return { camera: camera.position.clone().divideScalar(M).toArray().map((x) => +x.toFixed(3)), target: orbit.target.clone().divideScalar(M).toArray().map((x) => +x.toFixed(3)), orbit: [orbit.yaw, orbit.pitch, orbit.distance], canvas: [r.left, r.top, r.width, r.height], at: pts.map((q) => { const v = new THREE.Vector3(q[0], q[1], q[2]).multiplyScalar(M).project(camera); return [+(r.left + (v.x + 1) / 2 * r.width).toFixed(1), +(r.top + (1 - v.y) / 2 * r.height).toFixed(1), +v.z.toFixed(4)]; }) }; },
        // (a probe: her body drawn as it is, in one plain skin colour with no texture, or by its normals -- to tell a mark in
        // her texture from one in her shape or her shading)
        bodyLook: (mode: 'own' | 'plain' | 'normals') => { const bm = bodyOf()?.mesh; if (!bm) return false;
          const keep = (bm.userData.ownMaterial ??= bm.material) as THREE.Material | THREE.Material[];
          bm.material = mode === 'own' ? keep : mode === 'plain' ? new THREE.MeshStandardMaterial({ color: 0xd9a58a, roughness: 0.6 }) : new THREE.MeshNormalMaterial();
          return true; },
        // (a probe: HER SKIN'S TEXTURE -- her own, or one plain skin colour in its place, or a board of squares, 128 a side
        // of her texture with every eighth line dark -- to tell a mark in her texture, and how far her texture is stretched
        // where her skin has been moved, from one in her shape or her light (Joshua, 2026-11-11: "we have modified the mesh
        // so much the original texture doesn't match anymore, or is it another issue?"). `colour`: the plain one (her own
        // image's mean, MEASURED: sRGB 216, 169, 152); `bumps` false takes her bumps' map off too. The area round her
        // opening follows her material: vulvaMesh.ts keepMat.)
        skinTexture: (mode: 'own' | 'plain' | 'checker', colour = '#d8a998', bumps = true) => {
          const bm = bodyOf()?.mesh; if (!bm) return false;
          for (const m of (Array.isArray(bm.material) ? bm.material : [bm.material]) as THREE.MeshStandardMaterial[]) {
            const keep = (m.userData.probeTexture ??= { map: m.map, normalMap: m.normalMap }) as { map: THREE.Texture | null; normalMap: THREE.Texture | null };
            if (mode === 'own') { m.map = keep.map; m.normalMap = keep.normalMap; m.needsUpdate = true; continue; }
            const c = document.createElement('canvas'), size = mode === 'plain' ? 4 : 2048, n = 128, q = size / n; c.width = c.height = size;
            const g2 = c.getContext('2d')!;
            g2.fillStyle = colour; g2.fillRect(0, 0, size, size);
            if (mode === 'checker') {
              g2.fillStyle = '#a8705a'; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if ((x + y) % 2) g2.fillRect(x * q, y * q, q, q);
              g2.fillStyle = '#3a3050'; for (let k = 0; k <= n; k += 8) { g2.fillRect(k * q - 1, 0, 3, size); g2.fillRect(0, k * q - 1, size, 3); }
            }
            const t = new THREE.CanvasTexture(c);
            if (keep.map) { t.flipY = keep.map.flipY; t.wrapS = keep.map.wrapS; t.wrapT = keep.map.wrapT; t.channel = keep.map.channel; t.offset.copy(keep.map.offset); t.repeat.copy(keep.map.repeat); t.rotation = keep.map.rotation; t.center.copy(keep.map.center); }
            t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true;
            (m.userData.probeTextureMade as THREE.Texture | undefined)?.dispose(); m.userData.probeTextureMade = t;
            m.map = t; m.normalMap = bumps ? keep.normalMap : null; m.needsUpdate = true;
          }
          // (her doors' outsides and her skin round them as her look has them -- or, plain, the one colour too, with no
          // darker tone round her opening: what one solid skin colour would look like there)
          applyOpening();
          if (mode === 'plain' && organs && vulva) { organs.setDoorSkin(new THREE.Color(colour)); vulva.setSkeletonOpening(skeletonOpening && !organsGrowWomb, { lips: 0, tint: [1, 1, 1], reach: 0.025 }); }
          vulva?.sync();
          return true; },
        // (a probe: how her skin is drawn -- which sides of it, whether her model is mirrored into the room, and whether her
        // birth poses' own normals are on her)
        skinFacts: () => { const b = bodyOf(); if (!b) return null; b.mesh.updateMatrixWorld(true); return { side: b.material.side, mirrored: b.mesh.matrixWorld.determinant() < 0, birthNormals: birthNormalsOn && !!birthNormals, watched: birthNormals?.watched ?? null, facing: birthNormals?.facing ?? null, pose, normalVersion: (b.mesh.geometry.getAttribute('normal') as THREE.BufferAttribute | undefined)?.version ?? null }; },
        // (P4: her hand held up palm forward in a shape -- fist, open, or one finger lifted from a fist)
        handShowLast: () => showLast,
        /** (a probe: her skin's triangles near her right hand turned over in the pose she stands in -- each against her rest
         * turned by the bones carrying it -- and the bones and weights of their points) */
        handFolds: (cm = 8) => { const b = bodyOf(); if (!b || !measure || !babyFrame) return null; const mesh = b.mesh, g = mesh.geometry, tris = (mesh.userData.allIndices as ArrayLike<number> | undefined) ?? g.index!.array;
          mesh.updateMatrixWorld(true); mesh.skeleton.update();
          const bones = mesh.skeleton.bones, wr = bones[measure.joints.wristR].getWorldPosition(new THREE.Vector3()), near = cm * M / 100;
          const si = g.getAttribute('skinIndex'), sw = g.getAttribute('skinWeight'), pa = g.getAttribute('position') as THREE.BufferAttribute;
          const posed = new Map<number, THREE.Vector3>(), P = (i: number) => { let v = posed.get(i); if (!v) { v = mesh.getVertexPosition(i, new THREE.Vector3()); mesh.localToWorld(v); posed.set(i, v); } return v; };
          const rest = (i: number) => new THREE.Vector3().fromBufferAttribute(pa, i);
          // (the turn of the bones carrying a point: its bind-relative skinning matrices, blended)
          const turnOf = (i: number) => { const m = new THREE.Matrix4().set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), t = new THREE.Matrix4(); for (let c = 0; c < 4; c++) { const w = sw.getComponent(i, c); if (w <= 0) continue; t.multiplyMatrices(bones[si.getComponent(i, c)].matrixWorld, mesh.skeleton.boneInverses[si.getComponent(i, c)]); for (let e = 0; e < 16; e++) m.elements[e] += t.elements[e] * w; } return m; };
          const out: { tri: number; dot: number; at: number[]; bones: string[] }[] = [];
          for (let t = 0; t < tris.length / 3; t++) { const a = tris[t * 3], bb = tris[t * 3 + 1], c = tris[t * 3 + 2];
            if (P(a).distanceTo(wr) > near * 1.5) continue;
            const pn = new THREE.Vector3().crossVectors(P(bb).clone().sub(P(a)), P(c).clone().sub(P(a)));
            const r0 = rest(a), rn = new THREE.Vector3().crossVectors(rest(bb).sub(r0), rest(c).sub(r0)).applyMatrix3(new THREE.Matrix3().setFromMatrix4(turnOf(a).multiply(mesh.bindMatrix)));
            const d = pn.normalize().dot(rn.normalize());
            if (d < 0) out.push({ tri: t, dot: +d.toFixed(2), at: P(a).clone().divideScalar(M / 100).toArray().map((x) => +x.toFixed(1)), bones: [a, bb, c].map((i) => [0, 1, 2, 3].filter((k) => sw.getComponent(i, k) > 0.02).map((k) => `${bones[si.getComponent(i, k)].name}:${sw.getComponent(i, k).toFixed(2)}`).join(' ')) });
          }
          return { folded: out.length, worst: out.sort((p, q) => p.dot - q.dot).slice(0, 12) }; },
        /** (a probe: for each of her shape fields, how many of her points split by her texture's seams are moved apart by it --
         * a crack where it is laid -- and how many of them are near her right hand) */
        seamCracks: () => { const b = bodyOf(), sb = b ? shaped.find((x) => x.mesh === b.mesh) : undefined; if (!sb || !babyFrame) return null;
          const base = sb.fields.basePos, n = base.length / 3, key = (i: number) => `${Math.round(base[i * 3] / 2e-5)},${Math.round(base[i * 3 + 1] / 2e-5)},${Math.round(base[i * 3 + 2] / 2e-5)}`;
          const groups = new Map<string, number[]>(); for (let i = 0; i < n; i++) { const k = key(i); (groups.get(k) ?? groups.set(k, []).get(k)!).push(i); }
          const v = new THREE.Vector3(), out: Record<string, [number, number]> = {};
          for (const [name, f] of sb.fields.fields) {
            const d = new Map<number, number>(); for (let k = 0; k < f.index.length; k++) d.set(f.index[k], k);
            let apart = 0, nearHand = 0;
            for (const g of groups.values()) { if (g.length < 2) continue;
              const at = (i: number) => { const k = d.get(i); return k === undefined ? [0, 0, 0] : [f.pos[k * 3], f.pos[k * 3 + 1], f.pos[k * 3 + 2]]; };
              const a = at(g[0]); if (g.some((i) => { const q = at(i); return Math.hypot(q[0] - a[0], q[1] - a[1], q[2] - a[2]) > 1e-6; })) { apart++; v.set(base[g[0] * 3], base[g[0] * 3 + 1], base[g[0] * 3 + 2]).applyMatrix4(babyFrame.meshToRest); if (v.x < -0.2 && v.y > 0.6 && v.y < 1.0) nearHand++; } }
            if (apart) out[name] = [apart, nearHand];
          }
          return out; },
        /** (a probe: any hand shape, each finger's shares knuckle first, spread fourth) */
        handShowAs: (shape: Record<FingerName, number[]>) => { showShape = shape; if (touchTest !== 'show') setTouchTest('show'); return true; },
        handShow: (shape: string) => { const s2 = HAND_SHAPES[shape]; if (!s2) return null; showShape = s2; if (touchTest !== 'show') setTouchTest('show'); return Object.keys(HAND_SHAPES); },
        touchTest: (mode?: TouchTest) => { if (mode !== undefined) setTouchTest(mode); const m3 = (v?: THREE.Vector3) => v ? v.clone().divideScalar(M).toArray().map((x) => +x.toFixed(3)) : null; return { mode: touchTest, at: touchAt ? { cup: m3(touchAt.cup), button: m3(touchAt.button), tablet: m3(touchAt.tablet?.centre) } : null, grip: gripLast, joints: gripJointsNow(), press: pressLast, hands: kneeHold }; },
        // (P4: her contact points -- measured, and drawn as dots when `show`)
        contacts: (show?: boolean) => { if (show !== undefined) { contactsShown = show; drawContacts(); } const c = contactsOf(); if (!c) return null;
          return { count: c.set.points.length, missing: c.set.missing, sites: c.set.points.map((p) => ({ k: `${p.side}.${p.site}`, bone: c.mesh.skeleton.bones[p.bone]?.name, depthMm: +(p.depth * 1000).toFixed(1), tri: p.tri })) }; },
        // (P3b, her balance squatting: her centre of mass -- each part of her at its share of a woman's mass (de Leva 1996)
        // and her womb's weight at its middle -- against where her soles touch the mat, cm, world; `ahead` her forward)
        balance: () => balanceNow(),
        // (P4: the triangles that close her fingers' sides, drawn red over her, for a probe)
        fingerSplitShow: (on: boolean) => { const bm = bodyOf()?.mesh; if (!bm || !fingerSplit) return false;
          for (const m of [...(bm.parent?.children ?? [])]) if (m.name === 'finger-split-debug') m.removeFromParent();
          // (drawn apart, round: that mesh red)
          if (fingerFills) { const fm = fingerFills.mesh; fm.userData.keep ??= fm.material; fm.material = on ? new THREE.MeshBasicMaterial({ color: 0xff2020, side: THREE.DoubleSide }) : fm.userData.keep; return { filled: fingerFills.count }; }
          if (!on) return true;
          const T = fingerSplit.tris, filled = fingerSplit.filled, keptCount = T.length / 3 - filled;
          const mk = (idx: Uint32Array, color: number) => { const g = new THREE.BufferGeometry(); for (const k of ['position', 'normal', 'skinIndex', 'skinWeight']) { const at = bm.geometry.getAttribute(k); if (at) g.setAttribute(k, at); }
            g.morphAttributes = bm.geometry.morphAttributes; g.morphTargetsRelative = bm.geometry.morphTargetsRelative; g.setIndex(new THREE.BufferAttribute(idx, 1));
            const m = new THREE.SkinnedMesh(g, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); m.name = 'finger-split-debug'; m.frustumCulled = false;
            m.position.copy(bm.position); m.quaternion.copy(bm.quaternion); m.scale.copy(bm.scale); m.morphTargetDictionary = bm.morphTargetDictionary; m.morphTargetInfluences = bm.morphTargetInfluences; m.bind(bm.skeleton, bm.bindMatrix); bm.parent?.add(m); };
          mk(T.slice(keptCount * 3), 0xff2020); return { filled, kept: keptCount }; },
        fingerSplit: () => fingerSplit ? { cut: fingerSplit.cut, filled: fingerSplit.filled, holes: fingerSplit.holes, open: fingerSplit.open, rounded: fingerSplit.round.index.length, ms: Math.round(fingerSplitMs), turned: betterTurned, closing: fingerFills?.count ?? 0 } : null,
        /** her own fingers (ownFingersMesh.ts): how many were made, how many of her triangles they hide, stray rings, the time;
         * `on` false draws her file's fingers instead, true hers again */
        /** (a probe: her skin and her own fingers drawn as wireframe over themselves -- hers dark, the fingers' blue, their
         * nails red -- posed as they are) */
        wire: (on: boolean) => { const b = bodyOf(); if (!b) return null; const bm = b.mesh;
          for (const o of [...bm.children]) if (o.userData.probeWire) o.removeFromParent();
          if (!on) return false;
          const wireOf = (src: THREE.SkinnedMesh, mats: THREE.Material | THREE.Material[]) => { const w = new THREE.SkinnedMesh(src.geometry, mats); w.bind(src.skeleton, src.bindMatrix); w.frustumCulled = false; w.userData.probeWire = true; w.renderOrder = 10; bm.add(w); };
          const line = (color: number) => new THREE.MeshBasicMaterial({ color, wireframe: true, depthTest: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
          wireOf(bm, line(0x303030));
          if (ownFingers?.mesh.visible) wireOf(ownFingers.mesh, [line(0x1060ff), line(0xff2020)]);
          return true; },
        /** (a probe: her own fingers drawn flat red, their nails blue, to tell them from her) */
        ownFingersMark: (on: boolean) => { if (!ownFingers) return null; const m = ownFingers.mesh; m.userData.keep ??= m.material;
          // (her right hand's red, her left's green; nails blue)
          const r = ownFingers.rest(), g = m.geometry; g.userData.keepColor ??= g.getAttribute('color');
          const col = new Float32Array(r.pos.length); for (let i = 0; i < r.pos.length / 3; i++) col.set(r.pos[i * 3] > 0 ? [0.1, 0.9, 0.2] : [1, 0.12, 0.12], i * 3);
          g.setAttribute('color', on ? new THREE.BufferAttribute(col, 3) : g.userData.keepColor);
          m.material = on ? [new THREE.MeshBasicMaterial({ vertexColors: true }), new THREE.MeshBasicMaterial({ color: 0x2040ff })] : m.userData.keep; return on; },
        ownFingers: (on?: boolean) => { if (on !== undefined && ownFingers) { ownFingersOn = on; layOwnFingers(); applyLook(); }
          return ownFingers ? { on: ownFingersOn, made: ownFingers.made, hidden: ownFingers.hidden, stray: ownFingers.stray, points: ownFingers.mesh.geometry.getAttribute('position').count, version: ownFingers.version, ms: Math.round(ownFingersMs), measured: ownFingers.measured.map((m) => [m.from, m.tip, ...m.thick, ...m.off].map((x) => +(x * 1000).toFixed(1))) } : null; },
        // (P4: her fingers' triangles stretched most as she is posed now -- posed edge over rest edge -- and their points)
        fingerStretch: (count = 8) => { const bm = bodyOf()?.mesh, fw = fingerSplit ? { ownerOf: fingerSplit.owner, pastOf: fingerSplit.past, points: fingerWeights?.points ?? [] } : null; if (!bm || !fw || !babyFrame) return null;
          bm.updateMatrixWorld(true); bm.skeleton.update();
          const tris = ((bm.userData.allIndices as ArrayLike<number> | undefined) ?? bm.geometry.index!.array), touched = new Set(fw.points);
          const si = bm.geometry.getAttribute('skinIndex'), sw = bm.geometry.getAttribute('skinWeight'), bn = bm.skeleton.bones, R = babyFrame.meshToRest, pa = bm.geometry.getAttribute('position');
          const wOf = (i: number) => [0, 1, 2, 3].filter((c) => sw.getComponent(i, c) > 0.005).map((c) => `${bn[si.getComponent(i, c)].name}=${sw.getComponent(i, c).toFixed(2)}`).join('+');
          const rest = (i: number) => new THREE.Vector3(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(R);
          const posed = (i: number) => bm.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(bm.matrixWorld).divideScalar(M);
          const out: { s: number; v: number[] }[] = [];
          const upto = fingerSplit ? tris.length - fingerSplit.filled * 3 : tris.length;
          for (let t = 0; t < upto; t += 3) { const v = [tris[t], tris[t + 1], tris[t + 2]]; if (!v.some((x) => touched.has(x))) continue;
            const r = v.map(rest), p2 = v.map(posed); let worst = 0; for (let k = 0; k < 3; k++) { const a2 = r[k].distanceTo(r[(k + 1) % 3]); if (a2 > 0.0008) worst = Math.max(worst, p2[k].distanceTo(p2[(k + 1) % 3]) / a2); } out.push({ s: worst, v }); }
          out.sort((a2, b2) => b2.s - a2.s);
          return out.slice(0, count).map((o) => ({ stretch: +o.s.toFixed(1), pts: o.v.map((i) => ({ i, owner: fw.ownerOf[i], pastMm: +(fw.pastOf[i] * 1000).toFixed(1), rest: rest(i).multiplyScalar(100).toArray().map((x) => +x.toFixed(2)), posed: posed(i).multiplyScalar(100).toArray().map((x) => +x.toFixed(2)), raw: [0, 1, 2, 3].map((c) => `${si.getComponent(i, c)}:${sw.getComponent(i, c).toFixed(3)}`).join(' '), w: wOf(i) })) })); },
        /** (a probe: her file's fingers with the finger's shape or as filed; how many of her points it moves) */
        fingersFormOn: (on: boolean) => { fingersFormOn = on; applyLook(); return fingersFormed; },
        fingersRoundOn: (on: boolean) => { fingersRoundOn = on; applyLook(); return fingerSplit?.round.index.length ?? null; },
        fingerWeightsOn: (on: boolean) => { fingerWeightsOn = on; applyLook(); return { touched: fingerWeights?.touched ?? null }; },
        ankleWeightsOn: (on: boolean) => { ankleWeightsOn = on; applyLook(); return { touched: ankleWeights?.touched ?? null }; },
        // (P3b: her skin from heel to calf -- how much of each point her foot carries rather than her shin, by its height
        // over her ankle joint and how far forward of it, in cm, at her bind)
        ankleWeights: (side: 'L' | 'R' = 'L') => {
          const sk = bodyOf()?.mesh; if (!sk || !measure) return null;
          const g = sk.geometry, pa = g.getAttribute('position'), si = g.getAttribute('skinIndex'), sw = g.getAttribute('skinWeight');
          const bones = sk.skeleton.bones, ankle = side === 'L' ? measure.joints.ankleL : measure.joints.ankleR, knee = side === 'L' ? measure.joints.kneeL : measure.joints.kneeR;
          const bindInv = new THREE.Matrix4().copy(sk.bindMatrix).invert();
          const jointAt = (b: number) => new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().multiplyMatrices(bindInv, new THREE.Matrix4().copy(sk.skeleton.boneInverses[b]).invert()));
          const under = new Set<number>(); bones.forEach((b, k) => { for (let o: THREE.Object3D | null = b; o; o = o.parent) if (o === bones[ankle]) { under.add(k); break; } });
          const toe = bones.findIndex((b) => b.parent === bones[ankle]);
          const A = jointAt(ankle), K = jointAt(knee), up = K.clone().sub(A), shinG = up.length(); up.normalize();
          const fw = (toe >= 0 ? jointAt(toe) : A.clone().add(new THREE.Vector3(0, 0, 1))).sub(A); fw.addScaledVector(up, -fw.dot(up)).normalize();
          const cmPer = (bones[knee].getWorldPosition(new THREE.Vector3()).distanceTo(bones[ankle].getWorldPosition(new THREE.Vector3())) / M * 100) / shinG;
          const grid: Record<string, { n: number; foot: number; other: number }> = {}, v = new THREE.Vector3(), names = new Set<string>();
          for (let i = 0; i < pa.count; i++) {
            v.fromBufferAttribute(pa, i).sub(A);
            const h = v.dot(up) * cmPer, f = v.dot(fw) * cmPer, side2 = v.clone().addScaledVector(up, -v.dot(up)).addScaledVector(fw, -v.dot(fw)).length() * cmPer;
            if (h < -10 || h > 16 || side2 > 8 || f < -10 || f > 8) continue;
            let wf = 0, ws = 0, wo = 0; for (let k = 0; k < 4; k++) { const b = si.getComponent(i, k), w = sw.getComponent(i, k); if (w <= 0) continue; if (under.has(b)) wf += w; else if (b === knee) ws += w; else { wo += w; names.add(bones[b].name); } }
            if (wf + ws <= 0) continue;
            const key = `${Math.round(h)}|${f < -3 ? 'back' : f < 3 ? 'mid' : 'front'}`;
            const c = grid[key] ?? (grid[key] = { n: 0, foot: 0, other: 0 }); c.n++; c.foot += wf / (wf + ws); c.other += wo;
          }
          const rows: string[] = [];
          for (let h = 16; h >= -10; h--) rows.push(`${String(h).padStart(3)} cm | ` + ['back', 'mid', 'front'].map((s2) => { const c = grid[`${h}|${s2}`]; return c ? `${s2} ${(c.foot / c.n).toFixed(2)} (${c.n})` : `${s2}  -  `; }).join('  '));
          return { cmPerUnit: +cmPer.toFixed(3), shinCm: +(shinG * cmPer).toFixed(1), toeBone: toe >= 0 ? bones[toe].name : null, footBones: [...under].map((k) => bones[k].name), otherBones: [...names], rows };
        },
        // (P3b, her feet on the mat: each foot's ankle, its lowest skin, its heel and toes, in cm; the mat's top; the ankle's
        // dorsiflexion as the joint table reads it)
        feet: () => { const sk = bodyOf()?.mesh; if (!sk || !measure || !rig) return null; model?.updateMatrixWorld(true); sk.skeleton.update();
          const cm = (v: THREE.Vector3) => v.toArray().map((x) => +(x / M * 100).toFixed(1)), out: Record<string, unknown> = { matTop: pose === 'squat' ? +(BIRTH_MAT.thick * 100).toFixed(1) : 0 };
          const angles = jointLimits?.passive.read(currentTurns());
          for (const s of ['L', 'R'] as const) {
            const ai = s === 'L' ? measure.joints.ankleL : measure.joints.ankleR, verts = footVerts(sk, ai), p = new THREE.Vector3();
            let low = new THREE.Vector3(0, Infinity, 0), back = new THREE.Vector3(0, 0, Infinity), front = new THREE.Vector3(0, 0, -Infinity);
            for (const i of verts) { sk.getVertexPosition(i, p); sk.localToWorld(p); if (p.y < low.y) low = p.clone(); if (p.z < back.z) back = p.clone(); if (p.z > front.z) front = p.clone(); }
            // (along the foot, flat: its heel's underside -- the back quarter's lowest -- its ball's and its toes')
            const A0 = sk.skeleton.bones[ai].getWorldPosition(new THREE.Vector3()), fw = front.clone().sub(A0).setY(0).normalize();
            let s0 = Infinity, s1 = -Infinity; for (const i of verts) { sk.getVertexPosition(i, p); sk.localToWorld(p); const a = p.clone().sub(A0).dot(fw); s0 = Math.min(s0, a); s1 = Math.max(s1, a); }
            const part = (a: number, b: number) => { let y = Infinity; for (const i of verts) { sk.getVertexPosition(i, p); sk.localToWorld(p); const t = (p.clone().sub(A0).dot(fw) - s0) / (s1 - s0); if (t >= a && t <= b) y = Math.min(y, p.y); } return +(y / M * 100).toFixed(1); };
            out[s] = { ankle: cm(A0), lowest: cm(low), rearmost: cm(back), frontmost: cm(front), heel: part(0, 0.25), ball: part(0.55, 0.8), toes: part(0.85, 1), lengthCm: +((s1 - s0) / M * 100).toFixed(1), dorsi: angles ? +(s === 'L' ? angles.ankleL : angles.ankleR).toFixed(1) : null, n: verts.length };
          }
          out.planted = feetPlanted; return out; },
        jointHeights: (reapply?: boolean) => { const sk = bodyOf()?.mesh; if (!sk || !measure) return null; if (reapply && rig) rig.apply(currentTurns()); model?.updateMatrixWorld(true); const j = measure.joints as unknown as Record<string, number>, out: Record<string, number[]> = {};
          for (const k of ['pelvis', 'hipL', 'kneeL', 'ankleL', 'hipR', 'kneeR', 'ankleR', 'chest', 'neck', 'head']) { const b = sk.skeleton.bones[j[k]]; if (b) out[k] = b.getWorldPosition(new THREE.Vector3()).divideScalar(M / 100).toArray().map((x) => Math.round(x)); }
          return { ...out, modelPos: model ? model.position.clone().divideScalar(M / 100).toArray().map((x) => Math.round(x)) : null, modelQ: model ? model.quaternion.toArray().map((x) => +x.toFixed(3)) : null, placedQ: birthPlaced?.quaternion.toArray().map((x) => +x.toFixed(3)) ?? null, parent: model?.parent?.type ?? null }; },
        birth: (cmd?: { t?: number; pace?: BirthPace; run?: boolean; reset?: boolean }) => {
          if (cmd?.reset) birthControl('reset');
          if (cmd?.pace) birthPace = cmd.pace;
          const begun = birthClock !== null;
          if (cmd?.t !== undefined) { birthClock = cmd.t; birthRunning = cmd.run ?? false; trimBirthEvents(); }
          else if (cmd?.run !== undefined) { if (birthClock === null) birthClock = 0; birthRunning = cmd.run; }
          // (begun now: her bottoms come off -- bottomsOff())
          if (!begun && birthClock !== null) applyLook();
          const r0 = babyRoots()[0], headW = r0 && birthHeadModel ? headMiddle(r0) : null, pts = birthPath?.points;
          const along = headW && pts && pts.length > 1 ? (() => { const mouth = pts[pts.length - 1], t = mouth.clone().sub(pts[pts.length - 2]).normalize(); return +((headW.clone().sub(mouth).dot(t)) / M * 100).toFixed(1); })() : null;
          const offAxis = headW && pts ? +((Math.min(...pts.map((p) => p.distanceTo(headW)))) / M * 100).toFixed(1) : null;
          // (and its body: how far each joint of its back and legs that is in her canal lies from her canal's middle line --
          // one stiff length cut the corner of a canal that turns, by centimetres)
          const bodyOff = (() => {
            if (!r0 || !pts || pts.length < 3) return null;
            const mv0 = babyMoveOf(0, r0), v = new THREE.Vector3(), ab = new THREE.Vector3(), out: [string, number][] = [];
            for (const name of [...BABY_BONES.back, BABY_BONES.neck, ...BABY_BONES.leg.left.slice(0, 3), ...BABY_BONES.leg.right.slice(0, 3)]) {
              const b = mv0.bones.get(name); if (!b) continue;
              b.getWorldPosition(v);
              // (the nearest place on her canal's line; one whose nearest is an end of it is above her canal, in her womb, or
              // out of her -- a place on a line that turns can be square to a far part of it)
              let best = Infinity, inside = false;
              for (let k = 0; k + 1 < pts.length; k++) {
                ab.copy(pts[k + 1]).sub(pts[k]);
                const f0 = v.clone().sub(pts[k]).dot(ab) / Math.max(1e-12, ab.lengthSq()), f = Math.min(1, Math.max(0, f0)), dd = ab.multiplyScalar(f).add(pts[k]).distanceTo(v);
                if (dd < best) { best = dd; inside = !((k === 0 && f0 <= 0) || (k === pts.length - 2 && f0 >= 1)); }
              }
              if (inside) out.push([name, +(best / M * 100).toFixed(1)]);
            }
            return out;
          })();
          const rp = birthRest ? { pos: birthRest.position.toArray().map((x) => +x.toFixed(3)), rootLocal: r0?.position.toArray().map((x) => +x.toFixed(3)), womb: babyWomb ? [babyWomb.centre.x, babyWomb.centre.y, babyWomb.centre.z].map((x) => +x.toFixed(3)) : null, size: babyCurl?.size.toArray().map((x) => +x.toFixed(3)), scale: r0?.scale.x, skinAt: birthRestAt?.toArray().map((x) => +x.toFixed(3)), check: (() => {
            const b = bodyOf(), f = babyFrame; if (!b || !f || !birthRestAt || !babySkinAt || !babyHolder) return null;
            const pa = b.mesh.geometry.getAttribute('position') as THREE.BufferAttribute, v = new THREE.Vector3(); let best = -1, bd = Infinity;
            for (const i of babySkinAt) { v.fromBufferAttribute(pa, i).applyMatrix4(f.meshToRest); const d = v.distanceToSquared(birthRestAt); if (d < bd) { bd = d; best = i; } }
            b.mesh.updateMatrixWorld(true); const drawn = b.mesh.getVertexPosition(best, new THREE.Vector3()).applyMatrix4(b.mesh.matrixWorld);
            babyHolder.updateMatrixWorld(true); const held = babyHolder.localToWorld(birthRestAt.clone());
            return { restMatchCm: +(Math.sqrt(bd) * 100).toFixed(1), drawnVsHeldCm: +(drawn.distanceTo(held) / M * 100).toFixed(1), d: drawn.clone().sub(held).divideScalar(M / 100).toArray().map((x) => +x.toFixed(1)) };
          })() } : null;
          return { rest: rp, headPastMouthCm: along, headFromPathCm: offAxis, bodyOffPathCm: bodyOff && bodyOff.length ? Math.max(...bodyOff.map((x) => x[1])) : null, bodyInCanal: bodyOff, headR: r0 ? +(headRadiusOf(r0.scale.x) * 100).toFixed(2) : null, open: vulva?.drawnOpen, clock: birthClock, running: birthRunning, pace: birthPace, now: birthNow, path: birthPath ? { length: +birthPath.length.toFixed(4), points: birthPath.points.length } : null, head: birthHeadModel?.toArray().map((x) => +x.toFixed(3)) ?? null, line: birthLine(birthNow) };
        },
        // aim straight at her navel from her side, at a distance (a probe photographing it)
        navelAim: (distance: number, yawOff = 0, pitch = 0.05) => {
          if (!navel) return null; model?.updateMatrixWorld(true);
          const d = navel.piece.data, v = d.splits[d.splitStart[d.seed]], at = new THREE.Vector3();
          navel.mesh.getVertexPosition(v, at); navel.mesh.localToWorld(at);
          orbit.yaw = Math.PI / 2 + yawOff; orbit.pitch = pitch; orbit.distance = distance; orbit.target.copy(at); turning = false;
          return at.toArray().map((x) => +(x / M).toFixed(3));
        },
        canalPathSoft: (on: boolean) => { if (vulva) vulva.pathSoft = on; return true; },
        pubicPress: (on?: boolean) => ({ ...(on !== undefined ? ((pubicOn = on), {}) : {}), mm: +(pubicPress.x * 1000).toFixed(2), at: jiggle.pubicAt.value.toArray().map((x) => +x.toFixed(3)) }),
        navelPress: () => ({ press: +navelPress.toFixed(3), out: +navelSpring.x.toFixed(3), peak: +navelPeak.toFixed(3), bornFor: +navelBornFor.toFixed(1), soft: !!navelSoft, line: navelLine() }),
        softBelly: (o?: { on?: boolean; held?: { lean: number; side: number } | null; fed?: number }) => { if (o?.on !== undefined) softOn = o.on; if (o && 'held' in o) softHeld = o.held ?? null; if (o?.fed !== undefined) bellyFed = Math.max(0, Math.min(1, o.fed)); const v = jiggle.bellySoft.value; return { on: softOn, held: softHeld, want: softWant, now: { side: +softBelly.side.toFixed(3), sag: +softBelly.sag.toFixed(3), depth: +softBelly.depth.toFixed(3) }, shader: [v.x, v.y, v.z, v.w].map((x) => +x.toFixed(3)), upright: softUpright.toArray().map((x) => +x.toFixed(3)), down: softDown.toArray().map((x) => +x.toFixed(3)) }; },
        hipTurn: (on?: boolean) => { if (on !== undefined && on !== hipTurnOn) { hipTurnOn = on; birthRoomFor = ''; applyLook(); } return { on: hipTurnOn, here: hipTurnHere(), stats: hipTurn?.stats ?? null }; },
        kneeTurn: (on?: boolean) => { if (on !== undefined && on !== kneeTurnOn) { kneeTurnOn = on; birthRoomFor = ''; applyLook(); } return { on: kneeTurnOn, stats: kneeTurn?.stats ?? null }; },
        birthContact: (on?: boolean) => { if (on !== undefined && on !== birthContactOn) { birthContactOn = on; birthRoomFor = ''; applyLook(); } return { on: birthContactOn, valve: +contactValve.x.toFixed(3), stats: birthContact?.stats ?? null, legMeshes: skinned.filter((m) => { const a = (m.geometry as THREE.BufferGeometry).getAttribute('jiggle'); if (!a) return false; for (let i = 0; i < a.count; i++) if (a.getY(i) < 0) return true; return false; }).length, legs: Object.fromEntries(Object.entries(legMasses).map(([k, m]) => [k, +(Math.hypot(m.x, m.y, m.z) * 1000).toFixed(2)])) }; },
        vulvaBulge: (b: number) => { if (!vulva) return null; vulva.setBulge(b); return vulva.bulge; },
        vulva: (on: boolean, wire = false) => { if (!vulva) return null; vulva.show(on); vulva.wire(on && wire); const sk = model && findSkinnedMesh(model), m = vulva.mesh, c = new THREE.Vector3(), v = new THREE.Vector3(); let k = 0;
          model?.updateMatrixWorld(true);
          for (let i = 0; i < vulva.bake.count; i++) if (vulva.bake.ring[i] === 0) { m.getVertexPosition(i, v); m.localToWorld(v); c.add(v); k++; }
          c.divideScalar(Math.max(1, k));
          const avg = (keep: (i: number) => boolean) => { const a = new THREE.Vector3(); let q = 0; for (let i = 0; i < vulva!.bake.count; i++) if (keep(i)) { m.getVertexPosition(i, v); m.localToWorld(v); a.add(v); q++; } return a.divideScalar(Math.max(1, q)); };
          const fl = vulva.bake.flat, along = avg((i) => vulva!.bake.ring[i] === 0 && fl[i * 2 + 1] > 0.03).sub(avg((i) => vulva!.bake.ring[i] === 0 && fl[i * 2 + 1] < -0.03)), across = avg((i) => Math.abs(fl[i * 2 + 1]) < 0.008 && fl[i * 2] > 0.01).sub(avg((i) => Math.abs(fl[i * 2 + 1]) < 0.008 && fl[i * 2] < -0.01));
          const nrm = along.clone().cross(across).normalize();
          let hip: number[] | null = null;
          if (sk && measure) { const bones = sk.skeleton.bones, j = measure.joints, h = bones[j.hipL].getWorldPosition(new THREE.Vector3()).add(bones[j.hipR].getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5); hip = c.clone().sub(h).divideScalar(M).toArray().map((x) => +x.toFixed(4)); if (nrm.dot(c.clone().sub(h)) < 0) nrm.negate(); }
          return { points: vulva.bake.count, triangles: vulva.bake.index.length / 3, outline: vulva.bake.outline, missed: vulva.bake.missed, splitFromHips: hip, splitWorld: c.clone().divideScalar(M).toArray().map((x) => +x.toFixed(4)), fields: (() => { const b = bodyOf(), sh = b ? shaped.find((x) => x.mesh === b.mesh) : undefined; return sh ? { cleft: sh.fields.fields.has(BIRTH_CLEFT_FIELD), lips: sh.fields.fields.has(BIRTH_LIPS_FIELD), applied: sh.fields.last.split('|').filter((x) => /birth/i.test(x)) } : null; })(), faceYaw: +Math.atan2(nrm.x, nrm.z).toFixed(3), facePitch: +Math.asin(Math.max(-1, Math.min(1, nrm.y))).toFixed(3) }; },
        // the view aimed at a point off the middle of her hips (metres, world: across, up, forward), from a yaw, pitch and distance (cm)
        // the view aimed at her left knee joint (yaw, pitch, distance in cm), for a close look at the bend
        aimKnee: (yaw: number, pitch: number, distance: number, toAnkle = 0) => {
          const sk = model && findSkinnedMesh(model);
          if (!sk || !measure) return null;
          const k = sk.skeleton.bones[measure.joints.kneeL].getWorldPosition(new THREE.Vector3());
          // (and down her shin toward her ankle by `toAnkle`, 0..1: her knee bone's child is her foot's)
          const kb = sk.skeleton.bones[measure.joints.kneeL], foot = kb.children.find((c) => (c as THREE.Bone).isBone);
          if (toAnkle && foot) k.lerp(foot.getWorldPosition(new THREE.Vector3()), toAnkle);
          orbit.yaw = yaw; orbit.pitch = pitch; orbit.distance = distance; orbit.target.copy(k); turning = false;
          return orbit.target.toArray().map((x) => +(x / M).toFixed(3));
        },
        // HER BABY MEASURED (a probe's ruler): every vertex of it as drawn now, sliced every `stepCm` along its own long
        // axis from the crown of its head, each slice's widest and narrowest extent across (cm); `aimAt` (a share of its
        // length from its head) points the camera there
        // (a probe's look at her baby alone: her own meshes hidden, the baby's left)
        kneeHands: () => kneeHold,
        // (P2: her hands to her baby or on her knees, and how far they have come)
        babyHold: (mode?: 'hands' | 'knees' | 'cradle') => { if (mode) babyHold = mode; return { mode: babyHold, share: +babyHoldShare.toFixed(3), cradle: +cradleShare.toFixed(3), hands: kneeHold, place: cradle ? { z: +cradle.middle.z.toFixed(3), front: +cradle.front.toFixed(3), under: +cradle.under.toFixed(3) } : null }; },
        // (a probe's: how far its newborn is lifted off her, by which bone's skin, and its trunk's least gap to her)
        // (a probe's: the gap from her skin, as drawn now, of each of its trunk's parts and its legs' -- cm, the least)
        onHerGaps: () => { const r = babyRoots()[0]; let mesh: THREE.SkinnedMesh | null = null; r?.traverse((o) => { const m = o as THREE.SkinnedMesh; if (!mesh && m.isSkinnedMesh && m.visible) mesh = m; }); const m = mesh as THREE.SkinnedMesh | null; if (!m || !herSkin.idx.length) return null;
          m.skeleton.update(); r!.updateMatrixWorld(true); const SI = m.geometry.getAttribute('skinIndex'), SW = m.geometry.getAttribute('skinWeight'), out: Record<string, number> = {}, p = new THREE.Vector3();
          for (let i = 0; i < SI.count; i += 3) { let b = 0, w = -1; for (let k = 0; k < 4; k++) if (SW.getComponent(i, k) > w) { w = SW.getComponent(i, k); b = SI.getComponent(i, k); } const nm = m.skeleton.bones[b]?.name ?? ''; const part = ({ Bone_000: 'hips', Bone_001: 'hips', Bone_006: 'waist', Bone_005: 'waist', Bone_004: 'belly', Bone_003: 'chest', Bone_002: 'chest', Bone_022: 'neck', Bone_021: 'head', Bone_020: 'head', Bone_012: 'thighL', Bone_018: 'thighR', Bone_011: 'shinL', Bone_010: 'shinL', Bone_017: 'shinR', Bone_016: 'shinR' } as Record<string, string>)[nm]; if (!part) continue;
            m.getVertexPosition(i, p); m.localToWorld(p); const [best] = nearestHerSkin(p); if (best < 0) continue; const over = (p.x - herSkin.pos[best * 3]) * herSkin.nrm[best * 3] + (p.y - herSkin.pos[best * 3 + 1]) * herSkin.nrm[best * 3 + 1] + (p.z - herSkin.pos[best * 3 + 2]) * herSkin.nrm[best * 3 + 2]; out[part] = Math.min(out[part] ?? Infinity, over / M * 100); }
          return Object.fromEntries(Object.entries(out).map(([k2, v2]) => [k2, +v2.toFixed(1)])); },
        onHerLift: () => { const r = babyRoots()[0]; let who = ''; if (r && liftFor && liftWho >= 0) { const SI = liftFor.geometry.getAttribute('skinIndex'), SW = liftFor.geometry.getAttribute('skinWeight'); let b = 0, w = -1; for (let k = 0; k < 4; k++) if (SW.getComponent(liftWho, k) > w) { w = SW.getComponent(liftWho, k); b = SI.getComponent(liftWho, k); } who = liftFor.skeleton.bones[b]?.name ?? ''; }
          return { liftCm: +(babyLift.length() / M * 100).toFixed(2), byBone: who, leastGapCm: Number.isFinite(liftLeast) ? +(liftLeast / M * 100).toFixed(2) : null, pitchDeg: +babyPitch.toFixed(1), drapeDeg: Object.fromEntries([...drapeAt].map(([k2, v2]) => [k2, +v2.toFixed(1)])) }; },
        // (a probe's camera on her hand: aimed at where her left (or right) fingertip goes, from yaw/pitch/distance)
        aimHand: (side: 'L' | 'R', yaw: number, pitch: number, distance: number) => { const t = kneeTips[side]; if (!t) return false; orbit.yaw = yaw; orbit.pitch = pitch; orbit.distance = distance; orbit.target.copy(t); turning = false; return true; },
        // its soft body: on or off, and how far each part lags its pose now (degrees, the most), its drive
        // (a probe's: its cord -- cut it, and whether it is cut, what is drawn of it, how thick and how long outside her)
        babyCord: (cmd?: { cut?: boolean; placenta?: boolean }) => { const asked = cmd?.cut ? cutCord() : cmd?.placenta ? deliverPlacenta() : null;
          return { asked, cut: cordCut, cutAt: birthNow?.cutAt ?? null, events: { ...birthEvents }, outerShown: !!cordOuterMesh?.visible, stumpShown: !!cordStumpMesh?.visible, remnantShown: !!cordRemnantMesh?.visible, innerShown: !!cordMeshes[0]?.visible, acrossCm: babyCords[0] ? +(babyCords[0].radius * 200).toFixed(2) : null, outsideCm: cordOuter ? +(cordOuter.length * 100).toFixed(1) : null }; },
        // (a probe's: the afterbirth -- where the placenta is in it, whether it is drawn, the bowl)
        afterbirth: () => { const m = birthNow, pm = placentaMeshes[0], w = new THREE.Vector3();
          // (its middle, in the world: the middle of its laid disc as drawn now)
          if (pm) { pm.updateMatrixWorld(true); pm.geometry.computeBoundingSphere(); w.copy(pm.geometry.boundingSphere!.center).applyMatrix4(pm.matrixWorld); }
          return m ? { stage: m.stage, placentaFor: +m.placentaFor.toFixed(2), separate: +m.separate.toFixed(3), down: +m.placentaDown.toFixed(3), bowl: +m.bowl.toFixed(3), afterbirth: +m.afterbirth.toFixed(3), contraction: +m.contraction.toFixed(2), placentaShown: !!pm?.visible, placentaMoved: pm ? !pm.matrixAutoUpdate : null, holderShown: !!babyHolder?.visible, seeBaby: babyShown, placentaAt: pm ? w.toArray().map((x) => +(x / M).toFixed(3)) : null, bowlShown: !!afterBowl?.visible, bowlAt: afterBowl ? bowlWorld.toArray().map((x) => +(x / M).toFixed(3)) : null, belly: +birthBellyShare.toFixed(3) } : null; },
        // (a probe's: its skin's share shown, 0 plain .. 1 its own)
        babySkin: () => +babySkin.skinShow.value.toFixed(3),
        organsHidden: (on: boolean) => { organsOff = on; if (organs) organs.visible = !on && organs.visible; applyXray(); return organsOff; },
        babyAlong: (on?: boolean) => { if (on !== undefined) babyAlongOn = on; return babyAlongOn; },
        babySoft: (on?: boolean) => { if (on !== undefined) { babySoftOn = on; if (!on) setSqueeze(babySqueeze, null, M); } const r = babyRoots()[0], sb = r && softBabies.get(r); if (!sb) return { on: babySoftOn };
          return { on: babySoftOn, drive: +sb.drive.toFixed(3), ready: sb.ready, swing: +Math.max(...sb.vel.map((v) => v.length())).toFixed(3) }; },
        // (a probe: her baby drawn as wireframe over nothing, to see its head's shape against her opening's doors -- Joshua,
        // 2026-11-08: "Can you confirm it in like wireframe mode?")
        babyWire: (on: boolean) => {
          babyHolder?.traverse((o) => {
            const m = o as THREE.Mesh, u = m.userData as { solid?: THREE.Material | THREE.Material[] };
            if (!m.isMesh) return;
            if (on) { u.solid ??= m.material; m.material = new THREE.MeshBasicMaterial({ color: 0x1d5bff, wireframe: true, transparent: true, opacity: 0.55 }); }
            else if (u.solid) { m.material = u.solid; delete u.solid; }
          });
          return true;
        },
        // (a probe: her opening's frame in the world, metres -- its middle, the way through out of her, along it toward her
        // front, and across it -- to stand a camera square to it)
        doorMode: (m: 'slider' | 'soft' | 'sections' | 'cloth' | 'shared' | 'fitted', dials?: Partial<Record<'weight' | 'calm' | 'fit' | 'close' | 'stretch' | 'grip' | 'steps', number>>) => { if (!organs) return null; organs.pressMode = m; if (dials) Object.assign(organs.clothDials, dials); return { mode: m, dials: organs.clothDials }; },
        openingFrame: () => {
          if (!organs) return null;
          const f = organs.passFrame(null, 0), r = (v: THREE.Vector3, k = 1) => v.toArray().map((x) => +((x * k)).toFixed(4));
          return { centre: r(f.centre, 1 / M), axis: r(f.axis), up: r(f.up), across: r(f.across) };
        },
        herHidden: (on: boolean) => {
          // (her baby, and her organs -- her opening's doors among them -- stay)
          const inBaby = (o: THREE.Object3D) => { for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q === babyHolder || q === organs?.group || q.name === 'pelvicOrgans') return true; return false; };
          model?.traverse((o) => { if ((o as THREE.Mesh).isMesh && !inBaby(o)) { const u = o.userData as { wasVisible?: boolean }; if (on) { u.wasVisible ??= o.visible; o.visible = false; } else if (u.wasVisible !== undefined) { o.visible = u.wasVisible; delete u.wasVisible; } } });
          if (vulva) vulva.mesh.visible = !on;
          return true;
        },
        // HER BABY'S PARTS MEASURED (a probe's ruler, cm): its head (its own bones' skin, along and across it), and
        // slices square to its trunk at its neck, shoulders, chest, belly, hips and down its legs -- each the widest
        // and narrowest it is across, its arms and legs included where they lie beside it
        babyParts: () => {
          const r = babyRoots()[0]; if (!r) return null; r.updateMatrixWorld(true);
          const wp = (n: string) => r.getObjectByName(n)?.getWorldPosition(new THREE.Vector3()) ?? null;
          const hip = wp(BABY_BONES.leg.left[0])?.add(wp(BABY_BONES.leg.right[0])!).multiplyScalar(0.5), sh = wp(BABY_BONES.arm.left[0])?.add(wp(BABY_BONES.arm.right[0])!).multiplyScalar(0.5), neck = wp(BABY_BONES.neck), headB = wp(BABY_BONES.head), top = wp(BABY_BONES.crown);
          if (!hip || !sh || !neck || !headB || !top) return null;
          const knee = wp(BABY_BONES.leg.left[1])!.add(wp(BABY_BONES.leg.right[1])!).multiplyScalar(0.5), ankle = wp(BABY_BONES.leg.left[2])!.add(wp(BABY_BONES.leg.right[2])!).multiplyScalar(0.5);
          const P: number[] = [], lead: string[] = [], v = new THREE.Vector3();
          r.traverse((o) => { const m = o as THREE.SkinnedMesh; if (!m.isSkinnedMesh || !m.visible) return; m.skeleton.update(); const SI = m.geometry.getAttribute('skinIndex'), SW = m.geometry.getAttribute('skinWeight'), n = SI.count;
            for (let i = 0; i < n; i++) { m.getVertexPosition(i, v); m.localToWorld(v); P.push(v.x, v.y, v.z); let b = 0, w = -1; for (let k = 0; k < 4; k++) if (SW.getComponent(i, k) > w) { w = SW.getComponent(i, k); b = SI.getComponent(i, k); } lead.push(m.skeleton.bones[b]?.name ?? ''); } });
          const N = lead.length, cm = (x: number) => +((x / M) * 100).toFixed(1);
          const spans = (idx: number[], axis: THREE.Vector3) => {
            const u = Math.abs(axis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0); u.addScaledVector(axis, -u.dot(axis)).normalize(); const w = new THREE.Vector3().crossVectors(axis, u);
            const xs = idx.map((i) => v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).dot(u)), ys = idx.map((i) => v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).dot(w));
            let wide = 0, narrow = Infinity; for (let a = 0; a < 90; a++) { const ca = Math.cos((a * Math.PI) / 90), sa = Math.sin((a * Math.PI) / 90); let lo = Infinity, hi = -Infinity; for (let k = 0; k < xs.length; k++) { const q = xs[k] * ca + ys[k] * sa; lo = Math.min(lo, q); hi = Math.max(hi, q); } wide = Math.max(wide, hi - lo); narrow = Math.min(narrow, hi - lo); }
            return idx.length ? { wideCm: cm(wide), narrowCm: cm(narrow), points: idx.length } : null;
          };
          // the head: its own skin, from its crown along the way from its neck
          const H = top.clone().sub(neck).normalize(), headIdx: number[] = []; for (let i = 0; i < N; i++) if (lead[i] === BABY_BONES.head || lead[i] === BABY_BONES.crown) headIdx.push(i);
          let hlo = Infinity, hhi = -Infinity; for (const i of headIdx) { const t = v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).dot(H); hlo = Math.min(hlo, t); hhi = Math.max(hhi, t); }
          const A = sh.clone().sub(hip).normalize(), at = (p: THREE.Vector3) => p.dot(A), half = (0.75 / 100) * M;
          const slice = (level: number, skipHead = true) => { const idx: number[] = []; for (let i = 0; i < N; i++) { if (skipHead && (lead[i] === BABY_BONES.head || lead[i] === BABY_BONES.crown)) continue; const t = v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).dot(A); if (Math.abs(t - level) <= half) idx.push(i); } return spans(idx, A); };
          const h0 = at(hip), s0 = at(sh), n0 = at(neck);
          return {
            head: { lengthCm: cm(hhi - hlo), ...spans(headIdx, H) },
            neck: slice(n0), shoulders: slice(s0), chest: slice(h0 + 0.75 * (s0 - h0)), belly: slice(h0 + 0.45 * (s0 - h0)), hips: slice(h0),
            thighs: slice((h0 + at(knee)) / 2), knees: slice(at(knee)), shins: slice((at(knee) + at(ankle)) / 2), ankles: slice(at(ankle)),
            trunkCm: cm(s0 - h0),
          };
        },
        babyProfile: (stepCm = 1, aimAt?: number, distance = 30, yaw = 0, pitch = 0) => {
          const r = babyRoots()[0]; if (!r) return null; r.updateMatrixWorld(true);
          const P: number[] = [], v = new THREE.Vector3();
          r.traverse((o) => { const m = o as THREE.SkinnedMesh; if (!(m as THREE.Mesh).isMesh || !m.visible) return; const n = m.geometry.getAttribute('position').count; if (m.isSkinnedMesh) m.skeleton.update(); for (let i = 0; i < n; i++) { m.getVertexPosition(i, v); m.localToWorld(v); P.push(v.x, v.y, v.z); } });
          const N = P.length / 3; if (N < 10) return null;
          const c = new THREE.Vector3(); for (let i = 0; i < N; i++) c.x += P[i * 3] / N, c.y += P[i * 3 + 1] / N, c.z += P[i * 3 + 2] / N;
          // (its long axis: power iteration on the spread)
          const C = [0, 0, 0, 0, 0, 0, 0, 0, 0];
          for (let i = 0; i < N; i++) { const d = [P[i * 3] - c.x, P[i * 3 + 1] - c.y, P[i * 3 + 2] - c.z]; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) C[a * 3 + b] += d[a] * d[b]; }
          let ax = new THREE.Vector3(1, 1, 1).normalize(); for (let k = 0; k < 60; k++) ax = new THREE.Vector3(C[0] * ax.x + C[1] * ax.y + C[2] * ax.z, C[3] * ax.x + C[4] * ax.y + C[5] * ax.z, C[6] * ax.x + C[7] * ax.y + C[8] * ax.z).normalize();
          // (its head end first: the head model's middle, if known, says which)
          if (birthHeadModel) { const h = headMiddle(r)!; if (h.sub(c).dot(ax) < 0) ax.negate(); }
          const t = new Float32Array(N); let lo = Infinity, hi = -Infinity; for (let i = 0; i < N; i++) { t[i] = (P[i * 3] - c.x) * ax.x + (P[i * 3 + 1] - c.y) * ax.y + (P[i * 3 + 2] - c.z) * ax.z; lo = Math.min(lo, t[i]); hi = Math.max(hi, t[i]); }
          const step = (stepCm / 100) * M, len = hi - lo, rows: Array<{ fromHeadCm: number; n: number; wideCm: number; narrowCm: number; wide98Cm: number }> = [];
          const u0 = Math.abs(ax.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0); u0.addScaledVector(ax, -u0.dot(ax)).normalize(); const w0 = new THREE.Vector3().crossVectors(ax, u0);
          let aimPt: THREE.Vector3 | null = null;
          for (let s0 = hi; s0 > lo; s0 -= step) {
            const xs: number[] = [], ys: number[] = []; const mid = new THREE.Vector3(); let k = 0;
            for (let i = 0; i < N; i++) { if (t[i] > s0 || t[i] <= s0 - step) continue; v.set(P[i * 3] - c.x, P[i * 3 + 1] - c.y, P[i * 3 + 2] - c.z); xs.push(v.dot(u0)); ys.push(v.dot(w0)); mid.add(v); k++; }
            const from = (hi - s0) / M * 100;
            if (aimAt !== undefined && !aimPt && (hi - s0) / len >= aimAt && k) aimPt = mid.divideScalar(k).add(c);
            if (k < 3) { rows.push({ fromHeadCm: +from.toFixed(1), n: k, wideCm: 0, narrowCm: 0, wide98Cm: 0 }); continue; }
            // (widest and narrowest over 36 directions across)
            let wide = 0, narrow = Infinity, wide98 = 0;
            for (let a = 0; a < 36; a++) { const ca = Math.cos((a * Math.PI) / 36), sa = Math.sin((a * Math.PI) / 36); const pr = xs.map((x, i) => x * ca + ys[i] * sa).sort((p, q) => p - q); const span = pr[pr.length - 1] - pr[0], span98 = pr[Math.floor(pr.length * 0.99)] - pr[Math.floor(pr.length * 0.01)]; if (span > wide) { wide = span; } narrow = Math.min(narrow, span); wide98 = Math.max(wide98, span98); }
            rows.push({ fromHeadCm: +from.toFixed(1), n: k, wideCm: +(wide / M * 100).toFixed(1), narrowCm: +(narrow / M * 100).toFixed(1), wide98Cm: +(wide98 / M * 100).toFixed(1) });
          }
          if (aimPt) { orbit.yaw = yaw; orbit.pitch = pitch; orbit.distance = distance; orbit.target.copy(aimPt); turning = false; }
          return { lengthCm: +(len / M * 100).toFixed(1), vertices: N, straight: !!(babyRoot && babyStraight.get(babyRoot)), straightShown: !!(babyRoot && babyStraight.get(babyRoot)?.visible), rows };
        },
        aim: (yaw: number, pitch: number, distance: number, dx = 0, dy = 0, dz = 0) => {
          const sk = model && findSkinnedMesh(model);
          if (!sk || !measure) return null;
          const bones = sk.skeleton.bones, j = measure.joints, h = bones[j.hipL].getWorldPosition(new THREE.Vector3()).add(bones[j.hipR].getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5);
          orbit.yaw = yaw; orbit.pitch = pitch; orbit.distance = distance; orbit.target.set(h.x + dx * M, h.y + dy * M, h.z + dz * M); turning = false;
          // (held there: standing, her place puts the view's depth back at her middle every frame -- a probe's look at
          // something before her was pulled back to it)
          aimHeld = true;
          return orbit.target.toArray().map((x) => +(x / M).toFixed(3));
        },
        // everything above a height (metres, world) cut away, or nothing: a probe looking at her birth area under her belly
        clipAbove: (y: number | null) => { ctx.renderer.gl.localClippingEnabled = false; ctx.renderer.gl.clippingPlanes = y === null ? [] : [new THREE.Plane(new THREE.Vector3(0, -1, 0), y * M)]; return true; },
        babyMove: (i: number, kind: MoveKind, side?: 'left' | 'right') => { const r = babyRoots()[i]; if (!r) return false; startMove(babyMoveOf(i, r), kind, side); return true; },
        kicks: () => jiggle.kickAt.value.map((k, i) => ({ at: [k.x, k.y, k.z].map((x) => +x.toFixed(4)), mm: Math.round(k.w * 1000), dir: [jiggle.kickDir.value[i].x, jiggle.kickDir.value[i].y, jiggle.kickDir.value[i].z].map((x) => +x.toFixed(3)) })),
        babiesSet: (count: number, lie: string, seed?: number) => { babyCount = Math.min(3, Math.max(1, Math.round(count))); babyLie = (LIE_MODES as readonly string[]).includes(lie) ? lie as typeof babyLie : 'auto'; if (seed) babyLieSeed = seed; babyDirty = true; babyFitAt = -Infinity; applyLook(); refresh(); return true; },
        pushOff: (off: boolean) => { babyPushOff = off; if (babyPushField) layPush(babyPushField); return true; },
        baby: (on?: boolean) => { if (on !== undefined) { showBaby(on); refresh(); } return { shown: babyShown, loaded: !!babyRoot, held: !!babyHolder, line: babyLine(onChart(), body.babyWeight, babyCount), count: babyCount, lies: babyRoots().map((r) => r.userData.lie ?? null), at: babyRoot ? { position: babyRoot.position.toArray(), scale: babyRoot.scale.x, pushMm: babyPushField ? Math.round(babyPushField.most * 1000) : null, depthPct: babyAutoDepth, balanceDeg: babyBalanceDeg, shrink: babyCurled, fitMs: babyRoot.userData.fitMs ?? null, womb: babyWomb ? { centre: babyWomb.centre.toArray(), top: babyWomb.centre.y + sacRadius(babyWomb, 0, 1, 0), bottom: babyWomb.centre.y - sacRadius(babyWomb, 0, -1, 0), front: babyWomb.centre.z + sacRadius(babyWomb, 0, 0, 1), back: babyWomb.centre.z - sacRadius(babyWomb, 0, 0, -1), half: sacRadius(babyWomb, 1, 0, 0) } : null } : null }; },
        masses: () => ({ belly: { ...masses.belly }, breastL: { ...masses.breastL }, breastR: { ...masses.breastR }, shown: { belly: jiggle.belly.value.toArray(), breastL: jiggle.breastL.value.toArray(), breastR: jiggle.breastR.value.toArray() }, anchored: !!anchors }),
        kick: (vy: number, vx = 0, vz = 0) => { for (const m of Object.values(masses)) { m.vy += vy; m.vx += vx; m.vz += vz; } },
        settle: (frames: number, dt = 1 / 60) => { if (!cloth || !model) return null; for (let k = 0; k < frames; k++) { model.updateMatrixWorld(true); if (clothRefit) { refitCloth(cloth); clothRefit = false; } cloth.frame(dt); } return cloth.stats(); },
        settings: () => cloth?.simSettings ?? null,
        // her own frame run `seconds` at a fixed step -- walk, springs, the cloth -- between pictures (a software renderer
        // draws about one frame a second, so the room's own clock cannot show her moving)
        // the room's own clock held (its frames then move nothing), so only animate() moves her: a software renderer's
        // second-long frames are no measure of her motion
        hold: (on: boolean) => { clock.paused = on; clock.step = 0; },
        // (a probe: resolves once `n` more frames have been drawn -- a slow renderer draws a frame in seconds, and a shot taken
        // before the next one shows the camera as it was)
        frames: (n = 2) => frames(n),
        // the camera at any angle about her (yaw radians, 0 her front; pitch radians, below 0 from beneath)
        // (and how far off, world units, and at what height: for a close look at her neckline)
        look: (yaw: number, pitch?: number, distance?: number, height?: number, across?: number) => { orbit.yaw = yaw; if (pitch !== undefined) orbit.pitch = pitch; if (distance !== undefined) orbit.distance = distance; if (height !== undefined) orbit.target.y = height; if (across !== undefined) orbit.target.x = across; turning = false; },
        // Stage 2b: the procedural tee (garment/roomGarment.ts) tailored to her and put on her in place of the room's tees,
        // or taken off (null). Its construction: 'raglan' or 'setIn', with a gusset share 0..1; `extra` for the follow-up's
        // comparisons (neckline width and drop, a neck band, a set-in's bust shaping and armhole band).
        garment: (construction: 'raglan' | 'setIn' | null, gusset = 0.5, wire = false, extra: { neckWidth?: number; neckDrop?: number; bustShaping?: 'none' | 'ease' | 'dart'; neckBand?: number; armholeBand?: number; detail?: boolean } = {}) => {
          // the probe owns the garment from here: the outfit's own leaves it alone
          garmentProbed = true; garmentAuto = null;
          const g = putOnGarment(construction, gusset, wire, extra);
          if (!g) return null;
          const t = g.tailored;
          return { ms: t.ms, report: { ...t.report, seams: t.report.seams.map((q) => ({ name: q.name, a: q.lengthA, b: q.lengthB })) }, notes: t.draft.notes, particles: t.sewn.count };
        },
        // her arms turned on top of her pose (radians): out to her side, forward, elbows bent
        garmentPose: (raise: number, forward = 0, elbow = 0) => { if (!garmentRoom) return false; garmentRoom.pose.raise = raise; garmentRoom.pose.forward = forward; garmentRoom.pose.elbow = elbow; return true; },
        // which of her limbs it collides with (the stool comes with SIT when legs are on)
        garmentCapsules: (arms: boolean, legs: boolean) => { if (!garmentRoom) return false; garmentRoom.capsules = { arms, legs, stool: null }; return true; },
        // bind it where it lies and hold its neckline there (after it is on her)
        garmentSettle: () => { garmentRoom?.cloth.settle(); return !!garmentRoom; },
        // weightless, it only draws itself to its pattern over her (how it is eased on before it is pinned and let hang)
        garmentWeightless: (on: boolean) => { if (garmentRoom) garmentRoom.cloth.weightless = on; return !!garmentRoom; },
        // its strain now (length / pattern length x FIT): everywhere, and over the underarm
        garmentStrain: () => garmentRoom ? { all: garmentRoom.cloth.strain(), underarm: garmentRoom.cloth.strain((p) => garmentRoom!.underarm[p] === 1) } : null,
        garmentNeck: () => garmentRoom?.neck() ?? null,
        // the most stretched edges now, which particles and where, and what her skin carries under them (a probe's look)
        garmentWorst: (k = 8) => garmentRoom ? garmentRoom.cloth.worst(k).map((w) => ({ ...w, trunkOnly: garmentRoom!.tailored.placed.trunkOnly[w.a], piece: garmentRoom!.tailored.sewn.particlePiece[w.a] })) : null,
        // the particles furthest inside her skin now, and their floors (a probe's look at skin showing through)
        garmentDeepest: (k = 12) => garmentRoom ? garmentRoom.cloth.deepest(k).map((d) => ({ ...d, trunkOnly: garmentRoom!.tailored.placed.trunkOnly[d.p], piece: garmentRoom!.tailored.sewn.particlePiece[d.p] })) : null,
        // how sharply it folds now: the angle between neighbouring triangles (degrees)
        garmentFolds: (over = 70) => garmentRoom?.cloth.folds(over) ?? null,
        // its simulation settings changed in place (bend compliance, the fold limit...): for a probe's comparison
        garmentTune: (patch: Record<string, number>) => { if (!garmentRoom) return false; Object.assign(garmentRoom.cloth.simSettings, patch); return true; },
        // how far it stands off her navel and nipples (below 0: through it)
        garmentDetailGap: () => garmentRoom?.cloth.detailGap() ?? null,
        // her skin in front of the garment: posed vertices of her body inside a box (world) that stand out past the drawn
        // cloth over them (along its normal at the nearest particle, within `reach`), the furthest first, with the vertex
        garmentPokes: (lo: number[], hi: number[], reach = 1.2, k = 12) => {
          const body = skinned.find((m) => !!m.geometry.getAttribute('_cloth_cover'));
          if (!garmentRoom || !body) return null;
          body.updateMatrixWorld(true);
          const x = garmentRoom.cloth.positions, N = garmentRoom.cloth.drawNormals(), n = garmentRoom.tailored.sewn.count, P = body.geometry.getAttribute('position'), v = new THREE.Vector3();
          const out: { v: number; at: number[]; out: number }[] = [];
          for (let i = 0; i < P.count; i++) {
            body.getVertexPosition(i, v); v.applyMatrix4(body.matrixWorld);
            if (v.x < lo[0] || v.x > hi[0] || v.y < lo[1] || v.y > hi[1] || v.z < lo[2] || v.z > hi[2]) continue;
            let best = Infinity, bp = -1;
            for (let p = 0; p < n; p++) { const d = (x[p * 3] - v.x) ** 2 + (x[p * 3 + 1] - v.y) ** 2 + (x[p * 3 + 2] - v.z) ** 2; if (d < best) { best = d; bp = p; } }
            if (bp < 0 || best > reach * reach) continue;
            const o = (v.x - x[bp * 3]) * N[bp * 3] + (v.y - x[bp * 3 + 1]) * N[bp * 3 + 1] + (v.z - x[bp * 3 + 2]) * N[bp * 3 + 2];
            if (o > -0.05) out.push({ v: i, at: [v.x, v.y, v.z], out: o });
          }
          return out.sort((a, b) => b.out - a.out).slice(0, k);
        },
        // her skin the CAMERA sees in front of the garment: for each of her posed vertices inside a box (world), a ray
        // from the eye to it; where the drawn garment is met behind the vertex within `depth`, her skin stands in front
        // of the cloth there and shows. The drawn mesh, so the draw lift is included
        garmentSeen: (lo: number[], hi: number[], depth = 3, k = 12) => {
          const body = skinned.find((m) => !!m.geometry.getAttribute('_cloth_cover'));
          if (!garmentRoom || !body) return null;
          body.updateMatrixWorld(true);
          const mesh = garmentRoom.cloth.mesh, P = body.geometry.getAttribute('position'), v = new THREE.Vector3(), eye = new THREE.Vector3(), dir = new THREE.Vector3();
          mesh.geometry.computeBoundingSphere(); mesh.geometry.computeBoundingBox();
          camera.getWorldPosition(eye);
          const ray = new THREE.Raycaster();
          const side = (mesh.material as THREE.Material).side; (mesh.material as THREE.Material).side = THREE.DoubleSide;
          const out: { v: number; at: number[]; by: number }[] = [];
          let tested = 0;
          try {
            for (let i = 0; i < P.count; i++) {
              body.getVertexPosition(i, v); v.applyMatrix4(body.matrixWorld);
              if (v.x < lo[0] || v.x > hi[0] || v.y < lo[1] || v.y > hi[1] || v.z < lo[2] || v.z > hi[2]) continue;
              tested++;
              dir.subVectors(v, eye); const tv = dir.length(); dir.divideScalar(tv);
              ray.set(eye, dir); ray.near = 0; ray.far = tv + depth;
              const hits = ray.intersectObject(mesh, false);
              if (!hits.length || hits[0].distance <= tv) continue;
              out.push({ v: i, at: [v.x, v.y, v.z], by: hits[0].distance - tv });
            }
          } finally { (mesh.material as THREE.Material).side = side; }
          return { tested, seen: out.length, worst: out.sort((a, b) => b.by - a.by).slice(0, k) };
        },
        garmentShade: (on: boolean) => { garmentShade = on; return true; },
        // (her navel's SIDE PROFILE, for a graph: her skin and the shirt along the line down her middle through her navel's
        // tip -- `v` up her body, `out` along her navel's axis from its tip -- within `half` of it and `band` of the line)
        navelSlice: (half = 7, band = 0.6, frame?: { tipAt: number[]; n: number[] }) => {
          // (whichever cloth shirt she wears: the procedural garment, or the light tee's cloth copy)
          const det = (garmentRoom?.cloth as unknown as { detail?: { navelSurface: NavelSurface; navelSurfaceState(): unknown } } | undefined)?.detail;
          const surf = det?.navelSurface ?? (clothWorn() ? cloth?.navelSurface ?? null : fitted && fittedTee() === fitted.tee ? fitted.surface : null);
          const cm = garmentRoom?.cloth.mesh ?? (clothWorn() ? cloth?.mesh : undefined);
          const bm = bodyOf()?.mesh as THREE.SkinnedMesh | undefined;
          if (!bm) return null;
          let n: number[], tipAt: number[];
          if (frame) { n = frame.n; tipAt = frame.tipAt; }
          else if (surf?.surfaceOn) { n = [...surf.axis]; tipAt = [...surf.crown]; }
          else return null;
          const upDot = n[1], up = [-n[0] * upDot, 1 - n[1] * upDot, -n[2] * upDot], ul = Math.hypot(up[0], up[1], up[2]) || 1;
          up[0] /= ul; up[1] /= ul; up[2] /= ul;
          const side = [n[1] * up[2] - n[2] * up[1], n[2] * up[0] - n[0] * up[2], n[0] * up[1] - n[1] * up[0]];
          const slice = (P: ArrayLike<number>, count: number) => { const out: [number, number][] = [];
            for (let i = 0; i < count; i++) { const dx = P[i * 3] - tipAt[0], dy = P[i * 3 + 1] - tipAt[1], dz = P[i * 3 + 2] - tipAt[2];
              if (!Number.isFinite(dx)) continue;
              const v = dx * up[0] + dy * up[1] + dz * up[2], s = dx * side[0] + dy * side[1] + dz * side[2], o = dx * n[0] + dy * n[1] + dz * n[2];
              if (Math.abs(v) <= half && Math.abs(s) <= band && o > -half) out.push([+v.toFixed(3), +o.toFixed(3)]); }
            return out; };
          const vc = bm.geometry.getAttribute('position').count, P = new Float32Array(vc * 3), one = [0, 0, 0];
          const skinNow = () => { const sp = new SkinPose(bm); sp.refresh(); for (let i = 0; i < vc; i++) { sp.posedVertex(i, one); P[i * 3] = one[0]; P[i * 3 + 1] = one[1]; P[i * 3 + 2] = one[2]; } return slice(P, vc); };
          const felt = skinNow(), drawn = felt;
          const shirt = garmentRoom ? garmentRoom.cloth.positions : null;
          // (and the cloth as drawn finely round her navel, navelPatch.ts)
          const fineMesh = cm?.children.find((c) => c.name.endsWith('-navel')) as THREE.Mesh | undefined;
          const fineP = fineMesh?.visible ? (fineMesh.geometry.getAttribute('position')?.array as Float32Array | undefined) : undefined;
          const surface = det ? det.navelSurfaceState() : surf?.state() ?? null;
          // (the shirt AS DRAWN, cut exactly down her middle: each drawn triangle crossing the plane through her navel's
          // axis and her up, as a segment [v, out, v, out] -- the cloth's own triangles in its draw range and the fine ones)
          const cut = (g: THREE.BufferGeometry, start: number, count: number) => { const out: number[][] = [], Pa = g.getAttribute('position')?.array as ArrayLike<number> | undefined, I = g.index?.array as ArrayLike<number> | undefined;
            if (!Pa || !I) return out;
            const at = (i: number) => { const dx = Pa[i * 3] - tipAt[0], dy = Pa[i * 3 + 1] - tipAt[1], dz = Pa[i * 3 + 2] - tipAt[2];
              return [dx * up[0] + dy * up[1] + dz * up[2], dx * n[0] + dy * n[1] + dz * n[2], dx * side[0] + dy * side[1] + dz * side[2]]; };
            for (let t = start; t + 2 < Math.min(I.length, start + count); t += 3) { const q = [at(I[t]), at(I[t + 1]), at(I[t + 2])], seg: number[] = [];
              for (let e = 0; e < 3; e++) { const a = q[e], b = q[(e + 1) % 3]; if ((a[2] > 0) === (b[2] > 0)) continue; const f = a[2] / (a[2] - b[2]); seg.push(+(a[0] + (b[0] - a[0]) * f).toFixed(3), +(a[1] + (b[1] - a[1]) * f).toFixed(3)); }
              if (seg.length === 4 && Math.abs(seg[0]) <= half && seg[1] > -half) out.push(seg); }
            return out; };
          // (her skin cut the same way: an innie's pit as it is, which the envelope of her vertices fills in)
          const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(P, 3)); if (bm.geometry.index) sg.setIndex(bm.geometry.index);
          const skinCut = cut(sg, 0, Infinity);
          let drawnCut = cm ? [...cut(cm.geometry, cm.geometry.drawRange.start, Number.isFinite(cm.geometry.drawRange.count) ? cm.geometry.drawRange.count : Infinity), ...(fineMesh?.visible ? cut(fineMesh.geometry, 0, Infinity) : [])] : [];
          // (the FITTED tee as its shader draws it: its vertices posed, each moved as clothDetailAt -- the shader's CPU twin --
          // says for the state the room gave it this frame)
          let surfaceNow = surface;
          if (!cm && fitted && fittedTee() === fitted.tee) {
            const tee = fitted.tee, tc = tee.geometry.getAttribute('position').count, TP = new Float32Array(tc * 3), tp = new SkinPose(tee), q3 = [0, 0, 0];
            tp.refresh();
            const keepNow = clothKeep(), state = fitted.spots.fitted(keepNow, fitted.navel, fitted.surface.profileFor());
            for (let i = 0; i < tc; i++) { tp.posedVertex(i, q3); const p3: [number, number, number] = [q3[0], q3[1], q3[2]], dsp = clothDetailAt(p3, state).displacement; TP[i * 3] = p3[0] + dsp[0]; TP[i * 3 + 1] = p3[1] + dsp[1]; TP[i * 3 + 2] = p3[2] + dsp[2]; }
            const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(TP, 3)); if (tee.geometry.index) tg.setIndex(tee.geometry.index);
            drawnCut = cut(tg, 0, Infinity);
            surfaceNow = fitted.surface.state();
          }
          return { skin: felt, drawn, shirt: shirt ? slice(shirt, shirt.length / 3) : [], fine: fineP ? slice(fineP, fineP.length / 3) : [], drawnCut, skinCut, tipAt, n, press: clothPress(), keep: clothKeep(), paintFlatten: fabric?.navelFlatten() ?? 0, navelX: navelX(0), surface: surfaceNow };
        },
        // (the painted shirt's drape, tunicDrape.ts: how much of it is drawn inside her as fitted; and for a look at what
        // is in front of what -- it hidden, its depth bias, its depth test or blending off, her body's colour off, what is drawn)
        // her sneakers' heels over the floor (metres) and the steps heard so far (footsteps.ts)
        // her skin coming through the new tee: `mark` notes which of her skin it covers now (each of her points
        // within 1.5 cm of it, inside it); after, for those, which stand outside it and by how much (cm), with where
        // (cm from her pelvis, turned as she is turned in the room: y up, z her front) -- the worst `k`
        teePokes: (mark?: boolean, k = 20) => {
          const body = clothBody();
          if (!garmentRoom || !body || !measure) return null;
          model?.updateMatrixWorld(true);
          const { position: F, normal: FN } = teeSheetNow()!, cell = 2, grid = new Map<string, number[]>();
          for (let f = 0; f < F.length / 3; f++) {
            if (!Number.isFinite(F[f * 3])) continue;
            const key = `${Math.floor(F[f * 3] / cell)},${Math.floor(F[f * 3 + 1] / cell)},${Math.floor(F[f * 3 + 2] / cell)}`;
            (grid.get(key) ?? grid.set(key, []).get(key)!).push(f);
          }
          const v = new THREE.Vector3(), P = body.geometry.getAttribute('position');
          const offsetAt = (i: number): number | null => {
            body.getVertexPosition(i, v).applyMatrix4(body.matrixWorld);
            const cx = Math.floor(v.x / cell), cy = Math.floor(v.y / cell), cz = Math.floor(v.z / cell);
            let best = -1, bd = 2.25; // (within 1.5 cm: what it lies close over)
            for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) for (const f of grid.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []) {
              const d = (F[f * 3] - v.x) ** 2 + (F[f * 3 + 1] - v.y) ** 2 + (F[f * 3 + 2] - v.z) ** 2;
              if (d < bd) { bd = d; best = f; }
            }
            return best < 0 ? null : (v.x - F[best * 3]) * FN[best * 3] + (v.y - F[best * 3 + 1]) * FN[best * 3 + 1] + (v.z - F[best * 3 + 2]) * FN[best * 3 + 2];
          };
          if (mark) {
            const covered: number[] = [];
            for (let i = 0; i < P.count; i++) { const o = offsetAt(i); if (o !== null && o < 0) covered.push(i); }
            teeCovered = covered;
            return { covered: covered.length };
          }
          const hip = body.skeleton.bones[measure.joints.pelvis].getWorldPosition(new THREE.Vector3()), turn = (model?.getWorldQuaternion(new THREE.Quaternion()) ?? new THREE.Quaternion()).invert();
          // (her skin sorted by the bones mostly carrying it: her arms' and legs' may leave the tee's cover by right)
          const bones = body.skeleton.bones, limb = new Map<number, string>();
          for (const [j, name] of [[measure.joints.shoulderL, 'arm'], [measure.joints.shoulderR, 'arm'], [measure.joints.elbowL, 'hand'], [measure.joints.elbowR, 'hand'], [measure.joints.hipL, 'leg'], [measure.joints.hipR, 'leg']] as const) bones[j]?.traverse((o) => { const b = bones.indexOf(o as THREE.Bone); if (b >= 0) limb.set(b, name); });
          const si = body.geometry.getAttribute('skinIndex'), sw = body.geometry.getAttribute('skinWeight'), get = [si.getX, si.getY, si.getZ, si.getW], getW = [sw.getX, sw.getY, sw.getZ, sw.getW];
          const kindOf = (i: number) => { const share: Record<string, number> = {}; for (let c = 0; c < 4; c++) { const kind = limb.get(get[c].call(si, i)) ?? 'torso'; share[kind] = (share[kind] ?? 0) + getW[c].call(sw, i); } return Object.entries(share).sort((a, b) => b[1] - a[1])[0][0]; };
          const out: { v: number; out: number; at: number[]; kind: string }[] = [];
          let front = -Infinity;
          for (const i of teeCovered) {
            const o = offsetAt(i);
            const local = v.clone().sub(hip).applyQuaternion(turn);
            front = Math.max(front, local.z);
            if (o === null || o <= 0.05) continue;
            out.push({ v: i, out: +o.toFixed(2), at: [+local.x.toFixed(1), +local.y.toFixed(1), +local.z.toFixed(1)], kind: kindOf(i) });
          }
          out.sort((a, b) => b.out - a.out);
          const torso = out.filter((p) => p.kind === 'torso');
          // (her upper arms are the sleeves' to cover; her forearms and hands may leave the tee's cover by right)
          const arm = out.filter((p) => p.kind === 'arm');
          return { covered: teeCovered.length, frontMost: +front.toFixed(1), pokes: out.length, torso: torso.length, torsoOver3mm: torso.filter((p) => p.out > 0.3).length, arm: arm.length, armOver3mm: arm.filter((p) => p.out > 0.3).length, hand: out.filter((p) => p.kind === 'hand').length, leg: out.filter((p) => p.kind === 'leg').length, worst: torso.slice(0, k), worstLimb: arm.slice(0, 6) };
        },
        // the new tee INSIDE her: each of its drawn points behind her skin nearest it (along her skin's normal there, her
        // posed surface), more than 3 mm -- cloth her skin hides, through which a gap between her arm and her side shows
        // as a hole. How many, the deepest (cm) and where (cm from her pelvis, turned as she is: y up, z her front)
        teeInside: (k = 6) => {
          const body = clothBody(), sheet = teeSheetNow();
          if (!body || !sheet || !measure) return null;
          model?.updateMatrixWorld(true); body.skeleton.update();
          const P = body.geometry.getAttribute('position'), n = P.count, X = new Float32Array(n * 3), N = new Float32Array(n * 3), v = new THREE.Vector3();
          for (let i = 0; i < n; i++) body.getVertexPosition(i, v).applyMatrix4(body.matrixWorld).toArray(X, i * 3);
          const idx = body.geometry.getIndex(), tri = idx ? (idx.array as ArrayLike<number>) : null;
          if (tri) for (let t = 0; t + 2 < tri.length; t += 3) {
            const a = tri[t] * 3, b = tri[t + 1] * 3, c = tri[t + 2] * 3;
            const ux = X[b] - X[a], uy = X[b + 1] - X[a + 1], uz = X[b + 2] - X[a + 2], wx = X[c] - X[a], wy = X[c + 1] - X[a + 1], wz = X[c + 2] - X[a + 2];
            const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
            for (const q of [a, b, c]) { N[q] += nx; N[q + 1] += ny; N[q + 2] += nz; }
          }
          const cell = 2, grid = new Map<string, number[]>();
          for (let i = 0; i < n; i++) { const key = `${Math.floor(X[i * 3] / cell)},${Math.floor(X[i * 3 + 1] / cell)},${Math.floor(X[i * 3 + 2] / cell)}`; (grid.get(key) ?? grid.set(key, []).get(key)!).push(i); }
          const F = sheet.position, hip = body.skeleton.bones[measure.joints.pelvis].getWorldPosition(new THREE.Vector3()), turn = (model?.getWorldQuaternion(new THREE.Quaternion()) ?? new THREE.Quaternion()).invert();
          const inside: { cm: number; at: number[] }[] = [];
          for (let f = 0; f < F.length / 3; f++) {
            const x = F[f * 3], y = F[f * 3 + 1], z = F[f * 3 + 2];
            if (!Number.isFinite(x)) continue;
            const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
            let best = -1, bd = Infinity;
            for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) for (const i of grid.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []) {
              const d = (X[i * 3] - x) ** 2 + (X[i * 3 + 1] - y) ** 2 + (X[i * 3 + 2] - z) ** 2;
              if (d < bd) { bd = d; best = i; }
            }
            if (best < 0) continue;
            const l = Math.hypot(N[best * 3], N[best * 3 + 1], N[best * 3 + 2]) || 1;
            const depth = ((x - X[best * 3]) * N[best * 3] + (y - X[best * 3 + 1]) * N[best * 3 + 1] + (z - X[best * 3 + 2]) * N[best * 3 + 2]) / l;
            if (depth < -0.3) { const at = new THREE.Vector3(x, y, z).sub(hip).applyQuaternion(turn); inside.push({ cm: +(-depth).toFixed(2), at: [+at.x.toFixed(1), +at.y.toFixed(1), +at.z.toFixed(1)] }); }
          }
          inside.sort((a, b) => b.cm - a.cm);
          return { inside: inside.length, over1cm: inside.filter((p) => p.cm > 1).length, deepest: inside.slice(0, k) };
        },
        // THE ARMPIT (Joshua, 2026-11-07: "collision is really important for all points on the shirt... allow to stretch
        // and span natural bridges like around the arms"): her skin under her arm a floor for the body pieces too, and
        // where up her upper arm its capsule starts; nothing given, as they are
        armpit: (o?: { floor?: boolean; armStart?: number }) => {
          if (!garmentRoom) return null;
          if (o?.floor !== undefined) garmentRoom.cloth.floorUnderArm = o.floor;
          if (o?.armStart !== undefined) garmentRoom.capsules = { ...garmentRoom.capsules, armStart: o.armStart };
          return { floor: garmentRoom.cloth.floorUnderArm, armStart: garmentRoom.capsules.armStart ?? null };
        },
        // the new tee's material as it draws (which faces, and how): a probe's look at whether a hole is a face turned away
        teeMaterial: (patch?: { side?: number; cut?: boolean }) => {
          const m = garmentRoom?.cloth.mesh.material as THREE.Material | undefined;
          if (!m) return null;
          if (patch?.side !== undefined) { m.side = patch.side as THREE.Side; m.needsUpdate = true; }
          // (its cut edges drawn by the material, or every kept triangle drawn whole)
          if (patch?.cut !== undefined) { teeCutDrawn = patch.cut; setCutEdge(m, patch.cut); }
          return { name: m.name, side: m.side, transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite, cut: cutEdgeOn(m) };
        },
        // THE TEE ALONE (Joshua, 2026-11-07: "render the shirt by itself in a wireframe... hide the entire body so it's
        // easier to see holes"): everything else in the room hidden -- her body drawn neither in colour nor in depth, so
        // the tee's own far side shows through any hole -- and the tee in wireframe when `wire`; off puts it all back
        teeAlone: (on: boolean, wire = true) => {
          for (const undo of teeAloneWas.reverse()) undo();
          teeAloneWas = [];
          if (!on) return true;
          const tee = new Set<THREE.Object3D>(garmentRoom ? garmentRoom.cloth.drawn : []);
          if (!tee.size) return false;
          const materials = (m: THREE.Mesh) => (Array.isArray(m.material) ? m.material : [m.material]);
          // (the tee's own materials are left alone wherever else they are used: its navel patch shares its sheet's)
          const teeMaterials = new Set<THREE.Material>();
          for (const m of tee) for (const mat of materials(m as THREE.Mesh)) teeMaterials.add(mat);
          three.traverse((o) => {
            const m = o as THREE.Mesh;
            if (!m.isMesh) return;
            if (tee.has(m)) {
              for (const mat of materials(m)) { const was = (mat as THREE.MeshStandardMaterial).wireframe; (mat as THREE.MeshStandardMaterial).wireframe = wire; teeAloneWas.push(() => { (mat as THREE.MeshStandardMaterial).wireframe = was; }); }
            } else {
              // (drawn neither in colour nor depth rather than hidden: the room shows and hides some of her parts frame by
              // frame -- her womb's x-ray among them -- and her body holds the tee, so hiding it would hide the tee too)
              for (const mat of materials(m)) { if (teeMaterials.has(mat)) continue; const c = mat.colorWrite, d = mat.depthWrite; mat.colorWrite = false; mat.depthWrite = false; teeAloneWas.push(() => { mat.colorWrite = c; mat.depthWrite = d; }); }
            }
          });
          return true;
        },
        // the tee's OPEN EDGES and STRETCH (its sheet as drawn now, its points welded where they meet within 0.1 mm):
        // each run of edges with a triangle on one side only -- the neckline, the hem, the cuffs, and any hole -- with its
        // length and where it lies (cm from her pelvis, turned as she is: y up, z her front); `mark` notes every edge's
        // length now, and after, the most stretched since then
        teeSeams: (mark?: boolean, k = 6) => {
          const sheet = teeSheetNow(), body = clothBody();
          if (!sheet || !body || !measure) return null;
          const { position: X, index } = sheet, n = X.length / 3, cell = 0.05, tol = 0.01;
          const root = Int32Array.from({ length: n }, (_, i) => i), find = (i: number): number => { while (root[i] !== i) i = root[i] = root[root[i]]; return i; };
          const grid = new Map<string, number[]>(), used = new Uint8Array(n);
          for (const i of index) used[i] = 1;
          for (let i = 0; i < n; i++) {
            if (!used[i] || !Number.isFinite(X[i * 3])) continue;
            const cx = Math.floor(X[i * 3] / cell), cy = Math.floor(X[i * 3 + 1] / cell), cz = Math.floor(X[i * 3 + 2] / cell);
            for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) for (const j of grid.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []) {
              if (Math.hypot(X[i * 3] - X[j * 3], X[i * 3 + 1] - X[j * 3 + 1], X[i * 3 + 2] - X[j * 3 + 2]) <= tol) root[find(i)] = find(j);
            }
            const key = `${cx},${cy},${cz}`;
            (grid.get(key) ?? grid.set(key, []).get(key)!).push(i);
          }
          const edgeCount = new Map<string, number>(), edgeEnds = new Map<string, [number, number]>();
          for (let t = 0; t + 2 < index.length; t += 3) for (const [u, w] of [[index[t], index[t + 1]], [index[t + 1], index[t + 2]], [index[t + 2], index[t]]]) {
            const a = find(u), b = find(w);
            if (a === b) continue;
            const key = a < b ? `${a},${b}` : `${b},${a}`;
            edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1); edgeEnds.set(key, [u, w]);
          }
          const hip = body.skeleton.bones[measure.joints.pelvis].getWorldPosition(new THREE.Vector3()), turn = (model?.getWorldQuaternion(new THREE.Quaternion()) ?? new THREE.Quaternion()).invert();
          const local = (i: number) => new THREE.Vector3(X[i * 3], X[i * 3 + 1], X[i * 3 + 2]).sub(hip).applyQuaternion(turn);
          // the open edges, gathered into runs (edges meeting at a point)
          const open = [...edgeCount].filter(([, c]) => c === 1).map(([key]) => key.split(',').map(Number) as [number, number]);
          const runOf = new Map<number, number>(), link = new Map<number, number[]>();
          for (const [a, b] of open) { (link.get(a) ?? link.set(a, []).get(a)!).push(b); (link.get(b) ?? link.set(b, []).get(b)!).push(a); }
          const runs: { edges: number; points: number; lengthCm: number; at: number[]; low: number; high: number }[] = [];
          for (const start of link.keys()) {
            if (runOf.has(start)) continue;
            const id = runs.length, stack = [start], pts: number[] = [];
            runOf.set(start, id);
            while (stack.length) { const a = stack.pop()!; pts.push(a); for (const b of link.get(a)!) if (!runOf.has(b)) { runOf.set(b, id); stack.push(b); } }
            const c = new THREE.Vector3(); let low = Infinity, high = -Infinity, len = 0;
            for (const a of pts) { const l = local(a); c.add(l); low = Math.min(low, l.y); high = Math.max(high, l.y); }
            for (const [a, b] of open) if (runOf.get(a) === id) len += Math.hypot(X[a * 3] - X[b * 3], X[a * 3 + 1] - X[b * 3 + 1], X[a * 3 + 2] - X[b * 3 + 2]);
            c.divideScalar(pts.length);
            runs.push({ edges: open.filter(([a]) => runOf.get(a) === id).length, points: pts.length, lengthCm: +len.toFixed(1), at: [+c.x.toFixed(1), +c.y.toFixed(1), +c.z.toFixed(1)], low: +low.toFixed(1), high: +high.toFixed(1) });
          }
          runs.sort((a, b) => b.lengthCm - a.lengthCm);
          // the edges stretched most since the mark
          const lengthOf = (key: string) => { const [u, w] = edgeEnds.get(key)!; return Math.hypot(X[u * 3] - X[w * 3], X[u * 3 + 1] - X[w * 3 + 1], X[u * 3 + 2] - X[w * 3 + 2]); };
          if (mark) { teeEdgesAt = new Map([...edgeEnds.keys()].map((key) => [key, lengthOf(key)])); }
          const stretched: { times: number; cm: number; at: number[] }[] = [];
          if (teeEdgesAt && !mark) for (const key of edgeEnds.keys()) {
            const was = teeEdgesAt.get(key);
            if (!(was !== undefined && was > 0.05)) continue;
            const now = lengthOf(key), [u] = edgeEnds.get(key)!, l = local(u);
            stretched.push({ times: +(now / was).toFixed(2), cm: +now.toFixed(2), at: [+l.x.toFixed(1), +l.y.toFixed(1), +l.z.toFixed(1)] });
          }
          stretched.sort((a, b) => b.times - a.times);
          const lone = [...new Set(Array.from({ length: n }, (_, i) => (used[i] ? find(i) : -1)).filter((r) => r >= 0))].length;
          return { points: lone, edges: edgeCount.size, openRuns: runs.length, runs: runs.slice(0, 12), stretched: stretched.slice(0, k), over2x: stretched.filter((e) => e.times > 2).length, over1_5x: stretched.filter((e) => e.times > 1.5).length };
        },
        steps: () => ({ heels: sneakers?.heels().map((h) => +(h / M).toFixed(4)) ?? null, heard: stepsHeard, sound: tileSteps.on, walkedM: +walked.toFixed(3), strideM: measure && rig ? +(humanStride(measure, 'walk', bump / 100) / rig.bindScale).toFixed(3) : null }),
        // her walk on the strip (stepFeet), as drawn: each foot's ankle and ball in the STRIP's frame (metres; z is how far
        // along it, so a planted foot's stays put), whether her feet hold it, how far they brought her down, and -- with
        // `soles` -- each shoe's lowest point (or her foot's, barefoot) over the floor
        // the treadmill's slope (walkStrip.ts): -30..+30, 'ahead' or 'across'
        slope: (deg: number, heading: SlopeHeading = 'ahead') => { setSlope(deg, heading); return slopeLine(slope); },
        // v2: how deep each piece of her skeleton sits under her skin now, by bone (mm; the random-pose test)
        skeletonDepths: (stride?: number) => {
          skeletonV2Lay?.();
          if (!skeletonV2) return null;
          // (each bone named by the joint it is, where the room's measure knows it)
          const jt = measure?.joints as unknown as Record<string, number> | undefined, bones = bodyOf()?.mesh.skeleton.bones ?? [], label = new Map<string, string>();
          if (jt) for (const [k, i] of Object.entries(jt)) if (bones[i]) label.set(bones[i].name, k);
          // (her fingers left out: v2 draws its own fingers over them; every bone under her wrists but the hands' own)
          const skip = new Set<string>(), sk = bodyOf()?.mesh.skeleton;
          if (jt && sk) for (const w of [jt.wristL, jt.wristR]) sk.bones[w]?.traverse((o) => { if (o !== sk.bones[w]) skip.add(o.name); });
          // (and her feet: in her sneakers here)
          if (jt && sk) for (const a of [jt.ankleL, jt.ankleR]) sk.bones[a]?.traverse((o) => skip.add(o.name));
          return { footCoverMm, stretch: skeletonV2.stretch, fitLeft: skeletonV2.fitLeft, fitMostMm: skeletonV2.fitMostMm, wholeFits: skeletonV2.wholeFits, fitMoves: Object.fromEntries(Object.entries(skeletonV2.fitMoves).map(([k, mm]) => [label.get(k) || k, mm])), bones: skeletonV2.depths(M, stride, skip).map((b) => ({ ...b, joint: label.get(b.bone) ?? '' })) };
        },
        // how much room each foot's bones have under her skin, toward her toes and her heel (mm), as she stands now
        footRoom: () => {
          const sk = bodyOf()?.mesh.skeleton, jt = measure?.joints;
          if (!skeletonV2 || !sk || !jt) return null;
          const out: Record<string, unknown> = {};
          for (const [side, a] of [['left', jt.ankleL], ['right', jt.ankleR]] as const) {
            const names = new Set<string>(); sk.bones[a]?.traverse((o) => names.add(o.name));
            const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(model!.getWorldQuaternion(new THREE.Quaternion()));
            out[side] = skeletonV2.roomOf(names, M, fwd);
          }
          return out;
        },
        // the skeleton laid again with each whole group at a set size (her skull first; null: fitted), for a probe
        skeletonRelay: (scales: (number | null)[] | null) => { relaySkeletonV2?.(scales); applyXray(); return skeletonV2?.wholeFits ?? null; },
        // (debug) each of the six rays' crossings of her skin from a point in her rest frame as she stands (metres)
        skeletonRays: (x: number, y: number, z: number) => skeletonV2 ? skeletonV2.raysAt(M, x * M, y * M, z * M) : null,
        // the points the last `skeletonDepths` found close (orange) or through her skin (red), marked in the room
        skeletonMarks: (on: boolean) => {
          three.getObjectByName('skeletonMarks')?.removeFromParent();
          if (!on || !skeletonV2) return 0;
          const pts = skeletonV2.flagged, g = new THREE.SphereGeometry(0.004 * M, 6, 4), mesh = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ depthTest: false, transparent: true }), Math.max(1, pts.length));
          const m4 = new THREE.Matrix4(), c = new THREE.Color();
          pts.forEach((p, k) => { mesh.setMatrixAt(k, m4.makeTranslation(p.x, p.y, p.z)); mesh.setColorAt(k, c.set(p.through ? 0xff2020 : 0xff9a00)); });
          mesh.count = pts.length; mesh.name = 'skeletonMarks'; mesh.renderOrder = 999; mesh.frustumCulled = false;
          three.add(mesh);
          return pts.length;
        },
        // the view held on her doors' mouth from outside her along her canal (turned `yawOff`, `pitchOff` from that way,
        // radians): the same look at her skeleton's opening and at v2's, for setting one against the other
        doorsAim: (distance: number, yawOff = 0, pitchOff = 0) => {
          if (!organs) return null;
          const m = organs.mouthNow();
          orbit.yaw = Math.atan2(m.out.x, m.out.z) + yawOff; orbit.pitch = Math.asin(Math.max(-1, Math.min(1, m.out.y))) + pitchOff; orbit.distance = distance; orbit.target.copy(m.at); turning = false; aimHeld = true;
          return { at: m.at.toArray().map((x) => +(x / M).toFixed(4)), out: m.out.toArray().map((x) => +x.toFixed(3)), yaw: +orbit.yaw.toFixed(3), pitch: +orbit.pitch.toFixed(3) };
        },
        // her doors and the skin round them as drawn now (her pelvis's rest frame, metres), with her canal's line
        doorsDrawn: () => (organs ? { ...organs.doorsSeen(), path: organs.laid?.vagina.path ?? null, mouth: organs.mouthNow().at.toArray().map((x) => x / M) } : null),
        // her doors' seat in v2 tried another way (`v2Seat`): her pelvic organs laid again with it
        doorsSeat: (next?: Partial<typeof v2Seat>) => {
          if (next && !organsGrowWomb && v2OrganBones) {
            Object.assign(v2Seat, next);
            abdomen?.dispose(); abdomen = null; organs?.dispose(); organs = null;
            layOrgansV2(xrayPct > 0); applyOpening(); applyXray(); refresh();
          }
          return { ...v2Seat, mouth: organs ? organs.mouthNow().at.toArray().map((x) => +(x / M).toFixed(4)) : null, skinLaid: vulva ? vulva.seatLaid : null };
        },
        // her body's own skin that stands inside the tube round her canal as she is posed (vulvaMesh.ts `seatStrays`)
        seatStrays: (deep?: number) => (vulva ? vulva.seatStrays(deep) : null),
        // her opening: the skeleton's doors (true) or v2's own (false), and which of OPENING_LOOKS her skin round it has
        opening: (on?: boolean, look?: number) => { if (on !== undefined) { skeletonOpening = on; if (on) layOrgansV2(false); } if (look !== undefined) openingLook = look; applyOpening(); applyLook(); refresh(); return { skeleton: skeletonOpening, look: openingLook, looks: OPENING_LOOKS.length, drawn: vulva?.skeletonOpening ?? false, doors: organs?.doorsShown ?? false, openM: organs?.doorOpenM ?? null, dressed: vulva?.dressed ?? null, skinOpen: vulva?.drawnOpen ?? null, bottomsOff: bottomsOff(), canalM: vulva?.canalPath()?.length ?? null }; },
        // where her opening is in her own skin at rest (her rest frame, metres): the middle of v2's opening's line
        openingRest: () => (vulva ? vulva.openingRest().toArray().map((x) => +x.toFixed(5)) : null),
        // her skeleton's measured landmarks as they stand in v2 (skeletonInV2.ts carryLandmarks): the pelvis's and the torso's
        // files carried with the bone round each point, how far each named landmark went (mm), and her skeleton's pieces;
        // `cloud` (a list of piece names) also gives those pieces' points as laid (rest metres, every `stride`th)
        skeletonLandmarks: (cloud?: string[], stride = 1) => {
          if (!skeletonV2) { skeletonV2Lay?.(); return null; }
          const sk = skeletonV2, carry = (pts: number[][]) => sk.carry(pts);
          const pelvis = carryLandmarks(skeletonPelvis, carry, skeletonV2PelvisJoint, 'v2-body'), torso = carryLandmarks(skeletonTorso, carry, null, 'v2-body');
          const went: Record<string, number> = {};
          for (const [k, p] of Object.entries(skeletonPelvis.landmarks)) { const q = (pelvis.landmarks as Record<string, number[]>)[k]; went[k] = +(Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) * 1000).toFixed(1); }
          for (const k of ['symphysisTop', 'xiphoid', 'coccyx'] as const) { const p = skeletonTorso.landmarks[k], q = torso.landmarks[k]; went[`torso.${k}`] = +(Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) * 1000).toFixed(1); }
          const pts = cloud ? Array.from(sk.restPointsOf(new Set(cloud))).filter((_, i) => Math.floor(i / 3) % stride === 0).map((x) => +x.toFixed(5)) : null;
          // (and the inside of her rib cage, measured on her chest's bones as they are laid in her: actor/thoracicOrgans.ts)
          let thoraxNow: unknown = null;
          try { const t = measureThorax(sk.restPointsOf(new Set([ORGAN_SPINE[3]]))), r5 = (x: number) => +x.toFixed(5); thoraxNow = { rig: 'v2-body', frame: 'her rest frame: +y up, +z her front, +x her left, metres; measured on her chest bones as laid in v2 (sarahlab/skeletonInV2.ts)', sections: t.sections.map((q) => ({ y: r5(q.y), left: r5(q.left), right: r5(q.right), front: r5(q.front), back: r5(q.back) })), spineFront: t.spineFront.map((q) => [r5(q[0]), r5(q[1])]), xiphoid: t.xiphoid.map(r5), sternumTop: t.sternumTop.map(r5), apex: r5(t.apex) }; } catch (error) { thoraxNow = { error: String(error) }; }
          return { pelvis, torso, thorax: thoraxNow, went, pieces: sk.pieces(), fitMoves: sk.fitMoves, cloud: pts };
        },
        // a random pose from `seed` over her own (null: none), held to her ranges (the skeleton-in-v2 test)
        randomPose: (seed: number | null) => { randomTurns = seed === null ? null : randomPoseTurns(seed); applyMotion(); return randomTurns?.length ?? 0; },
        // her belly's organs: `fill` sets what her gut holds (actor/gut.ts GutState, any part of it); returns it, her needs,
        // their layout and sway, and whether any drawn point is not a number
        belly: (fill?: Partial<GutState>) => {
          if (fill) setGut({ ...gut, ...fill });
          const nan = (a: Float32Array | null) => { if (!a) return null; let n = 0; for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) n++; return n; };
          const bad: Record<string, number | null> = {};
          if (abdomen) for (const n of ['stomach', 'intestines', 'colon', 'rectum', 'kidneyL', 'kidneyR'] as const) bad[n] = nan(abdomen.drawn(n));
          // (each organ's box as drawn, metres: [least x, y, z, most x, y, z])
          const box: Record<string, number[]> = {};
          if (abdomen) for (const n of ['stomach', 'intestines', 'colon', 'rectum', 'kidneyL', 'kidneyR'] as const) { const a = abdomen.drawn(n); if (!a) continue; const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]; for (let i = 0; i < a.length; i += 3) for (let c = 0; c < 3; c++) { b[c] = Math.min(b[c], a[i + c]); b[3 + c] = Math.max(b[3 + c], a[i + c]); } box[n] = b.map((x) => +x.toFixed(3)); }
          return { box, thorax: thorax?.report() ?? null, gut: { ...gut }, needs: gutNeeds(gut), urineMlH: urineMlH(gut.waterMl), layout: abdomen?.laid ?? null, sway: abdomen?.sway() ?? null, nan: bad, wombRoom: organs?.wombRoom ? { top: organs.wombRoom.top, leanDeg: organs.wombRoom.leanDeg, bottom: organs.wombRoom.path[0], widest: Math.max(...organs.wombRoom.halves.map((h) => h[0])) } : null };
        },
        // her pelvic organs (v3, on her skeleton): their layout (rest metres), how much her bladder holds, and how far each
        // soft body is from where its bone holds it now (metres); `bladder` sets how much it holds
        organs: (bladderMl?: number) => {
          if (!organs) return null;
          if (bladderMl !== undefined) organs.setBladder(bladderMl);
          const w = organs.womb, baby = w ? babySize(w.week, body.babyWeight, babyCount) : null;
          // (v2's own canal's middle as drawn, world metres -- standing, her rest frame -- cervix top to mouth: to set against
          // her pelvis's measured axis, src/data/pelvis/v2.json `axis`)
          const v2Canal = vulva ? (vulva.canalPath()?.points ?? []).map((q) => [+(q.x / M).toFixed(4), +(q.y / M).toFixed(4), +(q.z / M).toFixed(4)]) : null;
          return { v2Canal, v2Opening: vulva ? vulva.openingRest().toArray().map((x) => +x.toFixed(4)) : null, v2Faces: vulva ? vulva.worldAxes() : null, v2WombLowest: v2Womb ? (() => { const w = v2Womb, r = sacRadius(w, 0, -1, 0); return [w.centre.x, w.centre.y - r, w.centre.z].map((x) => +x.toFixed(4)); })() : null, bladderMl: organs.bladder, layout: organs.laid, sway: organs.sway(), opening: organs.opening, doorSwing: organs.doorSwing, doorFold: organs.doorFold, doorAngles: organs.doorAngles, doorOpenCm: +(organs.doorOpenM * 100).toFixed(1), mouth: organs.passFrame(null, 0).centre.toArray().map((x) => +(x / M).toFixed(4)), ends: organs.doorEnds, seen: () => organs!.doorsSeen(), womb: w && { week: w.week, top: w.top, fundalHeight: w.fundalHeight, size: w.size, leanDeg: w.leanDeg, wallM: w.wallM, contents: w.contents, cervix: w.cervix },
            // her baby's head through her pelvis, plane by plane (actor/birthCanal.ts), at the size it is drawn
            passage: baby && headPassage(skeletonPelvis, skeletonTorso.landmarks.coccyx, baby.cm / 100) };
        },
        // her body kept level (actor/levelBody.ts): the posture she is easing toward and the one laid on her now (radians,
        // metres; lean and hips as world [x, z])
        level: () => ({ want: levelWant, now: level, line: walkNote('walkLean') }),
        // BALANCE TEST: on or off, and what it measured (metres; margin + inside her feet, - past them)
        stageBalance: (on?: boolean) => { if (on !== undefined) setBalance(on); const b = stageBalance; return b ? { com: b.com.map((x) => +x.toFixed(4)), heading: b.heading.map((x) => +x.toFixed(4)), speed: +b.speed.toFixed(3), step: balanceStep ? +balanceStep.margin.toFixed(4) : null, stepAt: balanceStep ? { com: balanceStep.com.map((x) => +x.toFixed(3)), heading: balanceStep.heading.map((x) => +x.toFixed(3)), given: balanceStep.given.map((q) => q.map((x) => +x.toFixed(3))) } : null, down: balanceDown, margin: +b.margin.toFixed(4), kg: +b.kg.toFixed(2), outline: b.outline.map((q) => [+q[0].toFixed(4), +q[1].toFixed(4)]), womb: b.womb.map((x) => +x.toFixed(4)), body: Object.fromEntries(Object.entries(b.body).map(([k, v]) => [k, JSON.parse(JSON.stringify(v, (_, x) => (typeof x === 'number' ? +x.toFixed(4) : x)))])), line: balanceLine() } : { line: balanceLine() }; },
        // each sole's weight-bearing points (BALANCE_BEARING), heel to toe: how far each is off the floor past where it
        // stood on it in her bind (metres, along the floor's normal)
        soleBearing: () => {
          const f = walkFeet; if (!f?.fresh || !measure) return null;
          const v = new THREE.Vector3(), g = slopeGrade(slope, measure.leftSign), across = Math.hypot(1, g.x, g.z);
          return f.soles.map((sole) => { const out: [number, number, number, number][] = []; sole.verts.forEach((i, n) => {
            if (sole.clear[n] > BALANCE_BEARING * M) return;
            sole.mesh.getVertexPosition(i, v); sole.mesh.localToWorld(v);
            const over = (v.y - stageY(v.x / M, v.z / M) * M - sole.floor) / across;
            out.push([+(v.z / M).toFixed(3), +((over - sole.clear[n]) / M).toFixed(4), +(over / M).toFixed(4), +(sole.clear[n] / M).toFixed(4)]);
          }); return out.sort((p, q) => p[0] - q[0]); });
        },
        walkFeet: (soles = false) => {
          const f = walkFeet, sk = bodyOf()?.mesh ?? (model ? findSkinnedMesh(model) : null);
          if (!f?.fresh || !sk || !model) return null;
          model.updateMatrixWorld(true);
          const p = new THREE.Vector3(), at = (i: number) => { sk.skeleton.bones[i].getWorldPosition(p); return [+(p.x / M).toFixed(4), +(p.y / M).toFixed(4), +(p.z / M + walked).toFixed(4)]; };
          // (its height over the slope's floor, drawn through where she stands)
          const lowest = (m: THREE.SkinnedMesh) => { let y = Infinity, x = 0, z = 0; const n = m.geometry.getAttribute('position').count; for (let i = 0; i < n; i++) { m.getVertexPosition(i, p); m.localToWorld(p); const over = p.y - stageY(p.x / M, p.z / M) * M; if (over < y) { y = over; x = p.x; z = p.z; } } return [+(x / M).toFixed(4), +(y / M).toFixed(4), +(z / M + walked).toFixed(4)]; };
          const shoes = soles ? (sneakersShown() && sneakers ? sneakers.meshes.map(lowest) : [lowest(sk)]) : null;
          return {
            walkedM: +walked.toFixed(4), x: +f.x.toFixed(4), drop: +f.drop.toFixed(4), bob: bobRange(), leg: +f.leg.toFixed(4), posedLeg: measure ? +(measure.legLength / f.upm).toFixed(4) : null, modelY: +(model.position.y / M).toFixed(4),
            feet: f.state.feet.map((s, k) => ({ toe: (() => { const e = rig ? rig.bind.findIndex((b) => b.parent === f.state.legs[k].ball) : -1; return e >= 0 ? at(e) : null; })(), locked: s.locked, onBall: s.onBall, stance: +s.stance.toFixed(3), applied: +s.applied.toFixed(3), liftShare: +s.liftShare.toFixed(3), need: +s.need.toFixed(4), heelRise: +s.heelRise.toFixed(4), targetOver: +(s.targetY - stageY(s.targetX, s.targetZ)).toFixed(4), slopePitch: +(s.slopePitch / THREE.MathUtils.DEG2RAD).toFixed(2), slopeRoll: +(s.slopeRoll / THREE.MathUtils.DEG2RAD).toFixed(2), speed: +s.speed.toFixed(3), clear: +s.clear.toFixed(4), weight: +s.weight.toFixed(3), heel: +s.heelRise.toFixed(4), flat: +s.flat.toFixed(3), ankle: at(f.state.legs[k].ankle), ball: f.state.legs[k].ball >= 0 ? at(f.state.legs[k].ball) : null, locks: s.locks, maxLockReleases: s.maxLockReleases })),
            soles: shoes,
          };
        },
        drapeInside: (o2?: { hide?: boolean; units?: number; factor?: number; noDepth?: boolean; opaque?: boolean; hang?: boolean; body?: boolean; list?: boolean }) => {
          if (o2?.body !== undefined) { const bm = bodyOf()?.mesh; if (bm) (bm.material as THREE.Material).colorWrite = o2.body; }
          if (o2?.list) { const seen: string[] = []; three.traverse((o) => { const mm = o as THREE.Mesh; if (mm.isMesh && mm.visible) { let v = true; for (let p: THREE.Object3D | null = mm; p; p = p.parent) if (!p.visible) v = false; if (v) seen.push(`${mm.name || mm.type}:${(Array.isArray(mm.material) ? mm.material[0] : mm.material)?.name ?? ''}`); } }); return seen; }
          let out: unknown = null, mesh: THREE.Mesh | null = null;
          three.traverse((o) => { if (o.userData.drapeInside) { out = o.userData.drapeInside; mesh = o as THREE.Mesh; } });
          const m = mesh as THREE.Mesh | null;
          if (m && o2?.hide !== undefined) m.visible = !o2.hide;
          if (m && o2?.units !== undefined) { const mat = m.material as THREE.Material; mat.polygonOffsetUnits = o2.units; mat.needsUpdate = true; }
          if (m && o2?.factor !== undefined) { const mat = m.material as THREE.Material; mat.polygonOffsetFactor = o2.factor; mat.needsUpdate = true; }
          if (m && o2?.noDepth !== undefined) { const mat = m.material as THREE.Material; mat.depthTest = !o2.noDepth; mat.needsUpdate = true; }
          if (m && o2?.opaque !== undefined) { const mat = m.material as THREE.Material; mat.transparent = !o2.opaque; mat.needsUpdate = true; }
          if (m && o2?.hang) { const c = m.geometry.getAttribute('color') as THREE.BufferAttribute; let lo = 0; for (let i = 0; i < c.count; i++) if (c.getW(i) > 0.01 && c.getW(i) < 0.9) lo++; return { ...(out as object), fading: lo, points: c.count }; }
          return out;
        },
        drapeProbe: (patch?: Partial<typeof DRAPE_PROBE>) => {
          if (patch) { Object.assign(DRAPE_PROBE, patch); if (patch.lead !== undefined) setDrapeLead(patch.lead); fabric?.reshaped(); }
          return { ...DRAPE_PROBE };
        },
        navelFine: (on?: boolean) => { if (on !== undefined) NavelPatch.off = !on; return !NavelPatch.off; },
        navelLift: (on?: boolean) => { const det = (garmentRoom?.cloth as unknown as { detail?: { navelLift: boolean } } | undefined)?.detail; if (!det) return null; if (on !== undefined) det.navelLift = on; return det.navelLift; },
        navelClothPress: (x?: number | null) => { if (x !== undefined) { navelPressHeld = x === null || !Number.isFinite(x) ? null : Math.max(0, Math.min(1, x)); applyLook(); } return { held: navelPressHeld, press: clothPress() }; },
        garmentProfile: (i = 0) => garmentRoom?.cloth.detailProfile(i) ?? null,
        garmentDetailShade: (patch?: { spread?: number; widen?: number; slope?: number; grow?: number }) => garmentRoom?.cloth.detailShade(patch) ?? null,
        garmentStats: () => garmentRoom?.cloth.stats() ?? null,
        // Stage 3: the new tee's settings, as its panel moves them (`final` true: let go, so a re-tailor one tailors),
        // its landmarks, and what of it is worn
        garmentSettings: (patch?: Record<string, unknown>, final = true) => { if (patch) garmentChanged(clampGarmentSettings({ ...garmentSettings, ...patch }, garmentSettings), final); return garmentSettings; },
        garmentStops: () => (garmentRoom && garmentAuto ? garmentRoom.stops() : null),
        // the worn edges in a box (world), with each end's pattern place (piece, u, v): where the cloth is cut too long or short
        garmentEdgesIn: (lo: number[], hi: number[]) => {
          if (!garmentRoom) return null;
          const t = garmentRoom.tailored.sewn, at = new Map<number, [number, number, number]>();
          for (let v = 0; v < t.vertexParticle.length; v++) if (!at.has(t.vertexParticle[v])) at.set(t.vertexParticle[v], [t.vertexPiece[v], t.uv[v * 2], t.uv[v * 2 + 1]]);
          return garmentRoom.cloth.edgesIn(lo, hi).map((e) => ({ ...e, pa: at.get(e.a), pb: at.get(e.b) }));
        },
        garmentWorn: () => (garmentRoom ? { worn: garmentRoom.cloth.active, of: garmentRoom.tailored.sewn.count, tailoring: garmentTailoring, tailorKey: garmentRoom.tailorKey, committed: garmentCommitted, outfit: !!garmentAuto } : null),
        // per particle, where it is (world) and its least and most strain and sharpest fold: a probe's crease map
        garmentStrainMap: () => garmentRoom ? { positions: Array.from(garmentRoom.cloth.positions.subarray(0, garmentRoom.tailored.sewn.count * 3)), map: Array.from(garmentRoom.cloth.strainMap()), fit: Array.from(garmentRoom.cloth.fitMap()), piece: Array.from(garmentRoom.tailored.sewn.particlePiece), pieces: garmentRoom.tailored.sewn.pieces } : null,
        // where the underside of her belly starts to hang, and by where entirely (her normal's height; equal: never), cut again
        garmentHang: (from: number, to: number, offset?: number, smoothing?: number) => { if (!garmentRoom) return false; garmentRoom.cloth.hang = [from, to]; if (offset !== undefined) garmentRoom.cloth.fitOffset = offset; if (smoothing !== undefined) garmentRoom.cloth.fitSmoothing = smoothing; garmentRoom.cloth.setRestShift(restShiftNow()); garmentRoom.cloth.refit(); return true; },
        // for the particles inside a box (world), the nearest of her posed vertices against the contact the cloth is using:
        // a contact far further than her nearest skin is the wrong surface (a probe's look at skin showing through)
        garmentContacts: (lo: number[], hi: number[]) => {
          const body = skinned.find((m) => !!m.geometry.getAttribute('_cloth_cover'));
          if (!garmentRoom || !body) return null;
          body.updateMatrixWorld(true);
          const x = garmentRoom.cloth.positions, P = body.geometry.getAttribute('position'), v = new THREE.Vector3(), pad = 4;
          const near: number[] = [];
          for (let i = 0; i < P.count; i++) {
            body.getVertexPosition(i, v); v.applyMatrix4(body.matrixWorld);
            if (v.x < lo[0] - pad || v.x > hi[0] + pad || v.y < lo[1] - pad || v.y > hi[1] + pad || v.z < lo[2] - pad || v.z > hi[2] + pad) continue;
            near.push(v.x, v.y, v.z);
          }
          const out: { p: number; at: number[]; nearest: number; contact: number }[] = [];
          const report = garmentRoom.cloth.contactOf.bind(garmentRoom.cloth);
          for (let p = 0; p < garmentRoom.tailored.sewn.count; p++) {
            const px = x[p * 3], py = x[p * 3 + 1], pz = x[p * 3 + 2];
            if (px < lo[0] || px > hi[0] || py < lo[1] || py > hi[1] || pz < lo[2] || pz > hi[2]) continue;
            let best = Infinity;
            for (let k = 0; k < near.length; k += 3) best = Math.min(best, Math.hypot(near[k] - px, near[k + 1] - py, near[k + 2] - pz));
            out.push({ p, at: [px, py, pz], nearest: best, contact: report(p) });
          }
          return out;
        },
        garmentWire: (on: boolean) => { if (!garmentRoom) return false; (garmentRoom.cloth.mesh.material as THREE.MeshStandardMaterial).wireframe = on; return true; },
        // her particles now (world), and which piece each is of, for a probe drawing its own pictures
        garmentParticles: () => garmentRoom ? { positions: Array.from(garmentRoom.cloth.positions.subarray(0, garmentRoom.tailored.sewn.count * 3)), piece: Array.from(garmentRoom.tailored.sewn.particlePiece) } : null,
        // (and what her skin's layout over her seat is still waiting to lay, laid: a probe's picture is of her as she is)
        animate: (secondsToRun: number, step = 1 / 60) => { const n = Math.max(0, Math.round(secondsToRun / step)); for (let k = 0; k < n; k++) advance(step); vulva?.settle(); return cloth?.stats() ?? null; },
        tears: (limit = 2) => cloth?.tears(limit) ?? null,
        // seated, the cloth stays on (the fitted tee does not stand in): to watch the cloth itself seated
        standIn: (on: boolean) => { seatedStandIn = on; },
        // (there is no hook to hide her body: "Always keep the base body visible" -- Joshua, 2026-10-27; review shots
        // show the garment on her as it is worn)
        particles: () => cloth?.particles() ?? null,
        // her skin as she is posed and shaped now (world, every vertex), and its triangles: for a probe to measure her
        posedBody: () => {
          const b = skinned.find((m) => !!m.geometry.getAttribute('_cloth_cover'));
          if (!b) return null;
          b.updateMatrixWorld(true);
          const n = b.geometry.getAttribute('position').count, out = new Array<number>(n * 3), v = new THREE.Vector3();
          for (let i = 0; i < n; i++) { b.getVertexPosition(i, v); v.applyMatrix4(b.matrixWorld); out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z; }
          return { position: out, index: Array.from(b.geometry.index?.array ?? []) };
        },
        // every mesh in her model, with whether it is drawn (for a probe hunting what shows through her skin)
        meshes: () => { const out: { name: string; material: string; visible: boolean; count: number }[] = []; model?.traverse((n) => { const m = n as THREE.Mesh; if (!m.isMesh) return; let v = true; for (let p: THREE.Object3D | null = m; p; p = p.parent) if (!p.visible) v = false; out.push({ name: m.name, material: (Array.isArray(m.material) ? m.material[0] : m.material).name, visible: v, count: m.geometry.getAttribute('position').count }); }); return out; },
        // ...and any of them hidden by name (a probe's question, until her look next changes)
        hideMesh: (name: string) => { let k = 0; model?.traverse((n) => { if ((n as THREE.Mesh).isMesh && (n.name === name || (Array.isArray((n as THREE.Mesh).material) ? false : ((n as THREE.Mesh).material as THREE.Material).name === name))) { n.visible = false; k++; } }); return k; },
        // her rest shape replaced by one given (body-local, every vertex, as `restBody` reads it: shape fields and morphs
        // included) and its normals, for a probe to try a correction on her: what the morphs add now is taken back off, so
        // drawn with them it is the shape given. Until her look next changes.
        setRest: (position: number[], normal: number[]) => {
          const b = skinned.find((m) => !!m.geometry.getAttribute('_cloth_cover'));
          if (!b) return false;
          const g = b.geometry, n = g.getAttribute('position').count;
          const P = new Float32Array(position), N = new Float32Array(normal), D = new Float32Array(n * 3);
          const dict = b.morphTargetDictionary ?? {}, infl = b.morphTargetInfluences ?? [], mp = g.morphAttributes.position ?? [], mn = g.morphAttributes.normal ?? [];
          for (const [, k] of Object.entries(dict)) {
            const w = infl[k] ?? 0, a = mp[k], c = mn[k]; if (!w) continue;
            for (let i = 0; i < n; i++) {
              if (a) { P[i * 3] -= w * a.getX(i); P[i * 3 + 1] -= w * a.getY(i); P[i * 3 + 2] -= w * a.getZ(i); }
              if (c) { D[i * 3] += w * c.getX(i); D[i * 3 + 1] += w * c.getY(i); D[i * 3 + 2] += w * c.getZ(i); }
            }
          }
          // the unit attribute that, with the morphs' normal offsets added, shades along the normal given (bodyCrease.ts)
          const u = [0, 0, 0];
          for (let i = 0; i < n; i++) {
            const l = Math.hypot(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]) || 1;
            unitBefore(N[i * 3] / l, N[i * 3 + 1] / l, N[i * 3 + 2] / l, D[i * 3], D[i * 3 + 1], D[i * 3 + 2], u);
            N[i * 3] = u[0]; N[i * 3 + 1] = u[1]; N[i * 3 + 2] = u[2];
          }
          g.setAttribute('position', new THREE.BufferAttribute(P, 3));
          g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
          return true;
        },
        // her skin coloured per vertex (rgb 0..1, every vertex) with her maps off, or back as it was with null: a probe
        // showing on her where a measurement points
        paintSkin: (rgb: number[] | null) => {
          const b = skinned.find((m) => !!m.geometry.getAttribute('_cloth_cover'));
          if (!b) return false;
          if (rgb) b.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(rgb), 3));
          for (const m of (Array.isArray(b.material) ? b.material : [b.material]) as THREE.MeshStandardMaterial[]) {
            const keep = (m.userData.probeMaps ??= { map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, metalnessMap: m.metalnessMap }) as { map: THREE.Texture | null; normalMap: THREE.Texture | null };
            m.vertexColors = !!rgb; m.map = rgb ? null : keep.map; m.normalMap = rgb ? null : keep.normalMap; m.needsUpdate = true;
          }
          return true;
        },
        // her crease's repair: still to come, and the last one worked out (what was found, what was left, how long)
        crease: () => ({ pending: creaseTimer !== 0 || crease.busy, where: crease.where, ms: crease.ms, prepareMs: crease.prepareMs, last: crease.last && { found: crease.last.found, left: crease.last.left, rounds: crease.last.rounds, moved: crease.last.moved, shaded: crease.last.shaded, most: crease.last.most, vertices: crease.last.vertices.length } }),
        // her crease's repair taken off and kept off (`on` false), or back to how the room does it
        creaseOff: (off: boolean) => { creaseDisabled = off; crease.enabled = !off; if (off) { crease.lift(); if (creaseTimer) { clearTimeout(creaseTimer); creaseTimer = 0; } } else applyLook(); return true; },
        // what of her skin is under a point of the screen (css px): the triangle's vertices, the point and how far
        // what is drawn at a place on the screen, nearest first (a probe's: which mesh a colour seen there belongs to) --
        // each mesh's name, its parent's, how far, and which side of it faces the view
        pickAny: (x: number, y: number, most = 6) => {
          const { width, height } = ctx.renderer.size(), ray = new THREE.Raycaster(), seen: THREE.Mesh[] = [];
          ray.setFromCamera(new THREE.Vector2((x / width) * 2 - 1, -(y / height) * 2 + 1), camera);
          three.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; let v = true; for (let q: THREE.Object3D | null = m; q; q = q.parent) if (!q.visible) v = false; if (!v) return; m.geometry.computeBoundingSphere(); m.geometry.computeBoundingBox(); seen.push(m); });
          return ray.intersectObjects(seen, false).slice(0, most).map((h) => ({ mesh: h.object.name || h.object.type, parent: h.object.parent?.name ?? '', cm: +(h.distance / M * 100).toFixed(1), facing: h.face ? +(h.face.normal.clone().transformDirection(h.object.matrixWorld).dot(ray.ray.direction) < 0 ? 1 : -1) : 0, group: h.face?.materialIndex ?? 0 }));
        },
        pick: (x: number, y: number) => {
          const b = skinned.find((m) => !!m.geometry.getAttribute('_cloth_cover'));
          if (!b) return null;
          const { width, height } = ctx.renderer.size();
          const ray = new THREE.Raycaster();
          ray.setFromCamera(new THREE.Vector2((x / width) * 2 - 1, -(y / height) * 2 + 1), camera);
          const hit = ray.intersectObject(b, false)[0];
          return hit ? { face: hit.face ? [hit.face.a, hit.face.b, hit.face.c] : null, point: hit.point.toArray(), distance: hit.distance, normal: hit.face?.normal.toArray() ?? null } : null;
        },
        // her skin drawn as its normals (a probe seeing what the GPU shades with), or back as it was
        normalSkin: (on: boolean | 'plain' | 'clone') => {
          const b = skinned.find((m) => !!m.geometry.getAttribute('_cloth_cover'));
          if (!b) return false;
          const keep = (b.userData.probeMaterial ??= b.material) as THREE.Material | THREE.Material[];
          const unpatched = () => { const c = (Array.isArray(keep) ? keep[0] : keep).clone(); c.onBeforeCompile = () => {}; c.customProgramCacheKey = () => 'probe-unpatched'; return c; };
          b.material = on === 'clone' ? unpatched() : on === 'plain' ? new THREE.MeshStandardMaterial({ color: 0xd9cfc7, roughness: 0.55 }) : on ? new THREE.MeshNormalMaterial() : keep;
          return true;
        },
        // her skin drawn one-sided (true) or as the file has it (a probe asking whether a mark is a triangle seen from behind)
        frontSide: (on: boolean) => {
          const b = skinned.find((m) => !!m.geometry.getAttribute('_cloth_cover'));
          if (!b) return false;
          for (const m of (Array.isArray(b.material) ? b.material : [b.material])) { m.userData.probeSide ??= m.side; m.side = on ? THREE.FrontSide : m.userData.probeSide; m.needsUpdate = true; }
          return true;
        },
        // which patches her skin's material carries (its program cache key)
        skinKey: () => { const b = skinned.find((m) => !!m.geometry.getAttribute('_cloth_cover')); const m = b && (Array.isArray(b.material) ? b.material[0] : b.material); return m ? { key: m.customProgramCacheKey(), side: m.side, type: m.type, attrs: Object.keys(b.geometry.attributes) } : null; },
        // her shape worked out again from her controls (undoing a probe's setRest)
        relook: () => { crease.lift(); for (const s of shaped) s.fields.last = ''; applyLook(); },
        // her skin's maps switched off or back on (a probe telling a mark painted on her from one her shape draws)
        skinMaps: (map: boolean, normalMap: boolean, mr = true) => {
          const b = skinned.find((m) => !!m.geometry.getAttribute('_cloth_cover'));
          if (!b) return false;
          for (const m of (Array.isArray(b.material) ? b.material : [b.material]) as THREE.MeshStandardMaterial[]) {
            const keep = (m.userData.probeMaps ??= { map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, metalnessMap: m.metalnessMap }) as { map: THREE.Texture | null; normalMap: THREE.Texture | null; roughnessMap: THREE.Texture | null; metalnessMap: THREE.Texture | null };
            m.map = map ? keep.map : null; m.normalMap = normalMap ? keep.normalMap : null;
            m.roughnessMap = mr ? keep.roughnessMap : null; m.metalnessMap = mr ? keep.metalnessMap : null; m.needsUpdate = true;
          }
          return true;
        },
        // ...and unposed (her rest shape with the shape fields and every morph as weighted now, body-local), with the
        // weights: the GPU's by name and the shape fields' (applied on the CPU)
        restBody: () => {
          const b = skinned.find((m) => !!m.geometry.getAttribute('_cloth_cover'));
          if (!b) return null;
          const g = b.geometry, p = g.getAttribute('position'), n = p.count, out = new Float32Array(n * 3);
          for (let i = 0; i < n; i++) { out[i * 3] = p.getX(i); out[i * 3 + 1] = p.getY(i); out[i * 3 + 2] = p.getZ(i); }
          const nr = g.getAttribute('normal'), nout = new Float32Array(n * 3);
          for (let i = 0; i < n; i++) { nout[i * 3] = nr.getX(i); nout[i * 3 + 1] = nr.getY(i); nout[i * 3 + 2] = nr.getZ(i); }
          const dict = b.morphTargetDictionary ?? {}, infl = b.morphTargetInfluences ?? [], mp = g.morphAttributes.position ?? [], mn = g.morphAttributes.normal ?? [];
          for (const [, k] of Object.entries(dict)) {
            const w = infl[k] ?? 0, a = mp[k], c = mn[k]; if (!w) continue;
            if (a) for (let i = 0; i < n; i++) { out[i * 3] += w * a.getX(i); out[i * 3 + 1] += w * a.getY(i); out[i * 3 + 2] += w * a.getZ(i); }
            if (c) for (let i = 0; i < n; i++) { nout[i * 3] += w * c.getX(i); nout[i * 3 + 1] += w * c.getY(i); nout[i * 3 + 2] += w * c.getZ(i); }
          }
          return { position: Array.from(out), normal: Array.from(nout), gpu: Object.fromEntries(Object.entries(dict).map(([name, k]) => [name, infl[k] ?? 0])), cpu: bodyShapeFieldWeights(body, bump, bellyCurve), relative: g.morphTargetsRelative };
        },
        strain: () => { if (!cloth) return null; const r = { ...cloth.strain(), jumps: cloth.jumps, moved: cloth.moved, worst: cloth.worstEdge }; cloth.moved = 0; return r; },
        // what shows through the tee now (her navel's height above the skin round it, the spots the shading draws)
        detail: () => (cloth ? { heights: cloth.detailHeights, keep: clothKeep(), spots: cloth.detail(clothKeep()) } : null),
        // the fitted tee's: her detail's heights, the tee's own navel over its smooth surface, and what is laid on it
        fitted: () => (fitted ? { heights: { navel: fitted.spots.navel.h, nipples: fitted.spots.nipples.map((d) => d.h) }, relief: fitted.navel.relief, fit: fitted.navel.last, keep: clothKeep(), state: fitted.spots.fitted(clothKeep(), fitted.navel), laid: fittedLaid } : null),
        // BREAST or NAVEL DETAIL set (null: AUTO), as the outfit editor's sliders do
        keep: (which: 'nipple' | 'navel', value: number | null) => fabric?.setDetail(which, value),
        restart: () => { cloth?.restart(); },
        // her skin's colour map swapped for another image (a URL), set up as the file's own was (sRGB, glTF's flipY): to
        // compare an enhanced skin on her before any file changes (Joshua, 2026-10-24); null puts the file's back
        skinMap: async (url: string | null) => {
          const b = skinned.find((m) => !!m.geometry.getAttribute('_cloth_cover'));
          const mat = b && (Array.isArray(b.material) ? b.material[0] : b.material) as THREE.MeshStandardMaterial;
          if (!mat) return null;
          const own = (mat.userData.ownMap ??= mat.map) as THREE.Texture | null;
          if (!url) { mat.map = own; mat.needsUpdate = true; return null; }
          const t = await new THREE.TextureLoader().loadAsync(url);
          if (own) { t.flipY = own.flipY; t.colorSpace = own.colorSpace; t.wrapS = own.wrapS; t.wrapT = own.wrapT; t.channel = own.channel; t.anisotropy = own.anisotropy; t.offset.copy(own.offset); t.repeat.copy(own.repeat); t.rotation = own.rotation; t.center.copy(own.center); t.matrixAutoUpdate = own.matrixAutoUpdate; t.matrix.copy(own.matrix); }
          mat.map = t; mat.needsUpdate = true;
          const im = t.image as { width: number; height: number };
          return [im.width, im.height];
        },
        // FACE's SKIN as the button sets it (a candidate's file fetched the first time), and what she wears now
        skinChoice: (id?: SkinId) => { if (id) { skinId = id; applySkin(); } return { chosen: skinId, worn: skinWorn, state: skinState, painted: !!painted, map: bodyOf()?.material.map?.name ?? null, size: (bodyOf()?.material.map?.image as { width?: number } | undefined)?.width ?? null }; },
        // a stroke of FACE's brush through screen points (CSS pixels), PAINT SKIN switched on for it; what changed
        skinStroke: async (points: readonly (readonly [number, number])[], set?: Partial<typeof brush>) => {
          skinPaintOn = true; Object.assign(brush, set ?? {});
          const p = await ensurePainter();
          if (!p || points.length === 0) return false;
          model?.updateMatrixWorld(true);
          const { width, height } = ctx.renderer.size();
          p.beginStroke(camera, width, height);
          let any = false;
          for (const [x, y] of points) any = p.stroke(x, y, brushSettings()) || any;
          p.endStroke(); refresh();
          return any;
        },
        skinUndo: () => painted?.painter.undo() ?? false,
        // FACE as its buttons set it, and the face's state now
        face: (set?: { hair?: boolean; on?: boolean; mode?: 'around' | 'camera' | 'ahead'; blinking?: boolean; talking?: boolean; mouth?: number; iris?: number; brows?: number; lips?: number }) => {
          if (set) {
            if (set.hair !== undefined) { hairOn = set.hair; for (const m of hairMeshes) m.visible = hairOn; }
            if (set.on !== undefined) faceOn = set.on;
            if (set.mode) faceMotion.mode = set.mode;
            if (set.blinking !== undefined) faceMotion.blinking = set.blinking;
            if (set.talking !== undefined) faceMotion.talking = set.talking;
            if (set.mouth !== undefined) faceMotion.mouth = set.mouth;
            if (set.iris !== undefined) irisIndex = set.iris;
            if (set.brows !== undefined) browPct = set.brows;
            if (set.lips !== undefined) lipPct = set.lips;
            refresh();
          }
          const b = bodyOf(); model?.updateMatrixWorld(true);
          // where the camera is in her head's rest frame (metres), and where the face's own probe point (her nose tip) lands in the world
          const cam = b ? restFromWorld(b.mesh, camera.position) : null;
          return { on: faceOn, laid: !!faceMaterial, mode: faceMotion.mode, jaw: faceMotion.jaw, blink: faceMotion.blink, gazeRight: [...faceMotion.gazeRight], gazeLeft: [...faceMotion.gazeLeft], cameraRest: cam, cameraWorld: camera.position.toArray() };
        },
        // every mesh drawn now (name, material, vertices): to tell what is what on screen
        drawn: () => { const out: string[] = []; three.traverseVisible((n) => { const m = n as THREE.Mesh; if (m.isMesh) out.push(`${m.name}|${(Array.isArray(m.material) ? m.material[0] : m.material).name}|${m.geometry.getAttribute('position')?.count}`); }); return out; },
        // the cloth's triangles folded over into her, and the particles they hold
        folds: (cos?: number) => cloth?.folds(cos) ?? null,
        // NECKLINE (-100 a turtleneck, 0 as made, 100 to under her bust) and its shape, as the slider and button set them
        neckline: (value: number, shape?: 'U' | 'V') => { neckline = value; if (shape) neckShape = shape; if (necklineInput) necklineInput.value = String(value); cloth?.setNeckline(neckline / 100, neckShape); cloth?.layOut(); refresh(); return cloth ? { particles: cloth.stats().particles, state: cloth.neckline(), deepestCm: cloth.necklineDeepest * 100 } : null; },
        /** SLEEVES as the button sets them (true the cap sleeves as made, false the tank), and what the cloth then trims. */
        sleeves: (on: boolean) => { sleeves = on; cloth?.setSleeves(sleeves); cloth?.layOut(); refresh(); return cloth ? { particles: cloth.stats().particles, trim: cloth.trim() } : null; },
        navelGap: (radius?: number) => { const b = skinned.find((m) => !!m.geometry.getAttribute('_cloth_cover')); return cloth && b ? cloth.navelGap(b, radius) : null; },
        // where the drawn sheet's hem hangs, each side of her (world units): to read a lopsided hang as a number
        hem: () => {
          if (!cloth) return null;
          const g = cloth.mesh.geometry, P = g.getAttribute('position').array as Float32Array, I = g.index!.array, end = Math.min(I.length, g.drawRange.count);
          let cx = 0, n = 0; for (let k = 0; k < end; k++) { cx += P[I[k] * 3]; n++; } cx /= Math.max(1, n);
          let left = Infinity, right = Infinity, front = Infinity, back = Infinity, cz = 0; for (let k = 0; k < end; k++) cz += P[I[k] * 3 + 2] / Math.max(1, n);
          for (let k = 0; k < end; k++) { const v = I[k] * 3, y = P[v + 1]; if (P[v] < cx) left = Math.min(left, y); else right = Math.min(right, y); if (P[v + 2] > cz) front = Math.min(front, y); else back = Math.min(back, y); }
          const r = (x: number) => Math.round(x * 10) / 10;
          return { left: r(left), right: r(right), front: r(front), back: r(back) };
        },
        tune: (t: Partial<ClothTune>) => { clothTune = { ...clothTune, ...t }; for (const [k, i] of clothDialInputs) i.value = String(clothTune[k as keyof ClothTune]); tuneCloth(); refresh(); },
        // her body hidden or shown, the cloth alone (her model's own visibility: the frame loop then leaves the cloth be)
        body: (on: boolean) => { if (model) model.visible = on; },
        // her skin alone undrawn (her clothes still drawn): to see a garment's own shape
        skin: (on: boolean) => { const b = skinned.find((m) => !!m.geometry.getAttribute('_cloth_cover')); for (const m of b ? (Array.isArray(b.material) ? b.material : [b.material]) : []) { m.colorWrite = on; m.depthWrite = on; } },
      };
    },

    update(frame: FrameInfo) {
      if (readyIn > 0 && --readyIn === 0 && readyBatch === batch) meter.ready();
      for (let k = frameWaiters.length - 1; k >= 0; k--) if (--frameWaiters[k].left <= 0) frameWaiters.splice(k, 1)[0].done();
      if (card) {
        const covered = `${Math.round(studio?.stage.bottom.getBoundingClientRect().height ?? 0) + 10}px`;
        if (card.element.style.getPropertyValue(LOADING_COVERED_VAR) !== covered) card.element.style.setProperty(LOADING_COVERED_VAR, covered);
        card.show(meter.snapshot(), cardPlace);
      }
      // her animation's own time: paused, slowed, or stepped one frame at a time (the builder's MOTION controls)
      const dt = clock.paused ? clock.step : frame.rawDt * clock.speed;
      clock.step = 0;
      if (turning) orbit.yaw += frame.rawDt * 0.35;
      placeCamera();
      frameMs += (frame.rawDt * 1000 - frameMs) / 20;
      advance(dt);
    },


    resize(width: number, height: number) {
      frame(width, height);
    },

    dispose() {
      disposed = true;
      tileSteps.dispose();
      if (creaseTimer) clearTimeout(creaseTimer);
      crease.dispose();
      dropPainter();
      skinFetched?.texture.dispose(); skinFetched = null;
      skinUpload?.texture.dispose(); skinUpload = null;
      for (const run of inflight.values()) run.abort.abort();
      inflight.clear();
      texturePanel?.dispose();
      texturePanel = null;
      fabric?.dispose();
      fabric = null;
      builder?.dispose();
      builder = null;
      dropCloth();
      garmentRoom?.dispose(); garmentRoom = null;
      garmentPanel?.dispose(); garmentPanel = null;
      hud?.remove();
      hud = null;
      thorax?.dispose(); thorax = null; abdomen?.dispose(); abdomen = null; organs?.dispose(); organs = null;
      dropBabyHolder();
      babyCopies = [];
      if (babyRoot) { release(babyRoot); babyRoot = null; }
      if (model) { three.remove(model); rig?.dispose(); release(model); model = null; }
      skinned = [];
      three.remove(hemi, key, rim, floor, ring, stool);
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
      strip.dispose();
      stool.geometry.dispose();
      (stool.material as THREE.Material).dispose();
      three.background = null;
    },
  };
}

export function createSarahLabScene(wire: SarahLabWire): SceneFactory {
  return (ctx) => buildSarahLabScene(ctx, wire(ctx));
}
